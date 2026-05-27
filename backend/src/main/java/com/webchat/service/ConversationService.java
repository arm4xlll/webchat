package com.webchat.service;

import com.webchat.dto.response.ConversationResponse;
import com.webchat.dto.response.ReadReceiptEvent;
import com.webchat.dto.response.UserResponse;
import com.webchat.model.Conversation;
import com.webchat.model.ConversationMember;
import com.webchat.model.User;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.repository.ConversationRepository;
import com.webchat.repository.MessageRepository;
import com.webchat.sse.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final MessageRepository messageRepository;
    private final UserService userService;
    private final EventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<ConversationResponse> getForUser(UUID userId) {
        List<Conversation> convs = conversationRepository.findByMemberUserId(userId);
        if (convs.isEmpty()) return List.of();

        List<UUID> convIds = convs.stream().map(Conversation::getId).toList();
        Map<UUID, Integer> unreadMap = new HashMap<>();
        messageRepository.countUnreadByConversations(convIds, userId)
                .forEach(row -> unreadMap.put((UUID) row[0], ((Number) row[1]).intValue()));

        return convs.stream()
                .map(conv -> ConversationResponse.from(conv, unreadMap.getOrDefault(conv.getId(), 0)))
                .sorted((a, b) -> {
                    Instant at = a.lastMessageAt() != null ? a.lastMessageAt() : a.createdAt();
                    Instant bt = b.lastMessageAt() != null ? b.lastMessageAt() : b.createdAt();
                    return bt.compareTo(at);
                })
                .toList();
    }

    @Transactional
    public ConversationResponse getOrCreateDirect(UUID currentUserId, UUID targetUserId) {
        return conversationRepository
                .findDirectConversation(currentUserId, targetUserId)
                .map(ConversationResponse::from)
                .orElseGet(() -> {
                    User currentUser = userService.getEntityById(currentUserId);
                    User targetUser = userService.getEntityById(targetUserId);

                    Conversation conv = Conversation.builder().type("direct").build();
                    conversationRepository.save(conv);

                    memberRepository.save(ConversationMember.builder()
                            .conversation(conv).user(currentUser).build());
                    memberRepository.save(ConversationMember.builder()
                            .conversation(conv).user(targetUser).build());

                    log.info("Created direct conversation {} between {} and {}",
                            conv.getId(), currentUserId, targetUserId);

                    ConversationResponse response = new ConversationResponse(
                            conv.getId(),
                            conv.getType(),
                            List.of(UserResponse.from(currentUser), UserResponse.from(targetUser)),
                            conv.getCreatedAt(),
                            Map.of(),
                            null,
                            0
                    );

                    eventPublisher.publishToUser(targetUserId, "conversation.created", response);
                    return response;
                });
    }

    @Transactional
    public ConversationResponse getOrCreateSaved(UUID userId) {
        return conversationRepository.findSavedConversation(userId)
                .map(ConversationResponse::from)
                .orElseGet(() -> {
                    User user = userService.getEntityById(userId);
                    Conversation conv = Conversation.builder().type("saved").build();
                    conversationRepository.save(conv);
                    memberRepository.save(ConversationMember.builder()
                            .conversation(conv).user(user).build());
                    log.info("Created saved conversation {} for user {}", conv.getId(), userId);
                    return ConversationResponse.from(conv, 0);
                });
    }

    @Transactional(readOnly = true)
    public Conversation getEntityById(UUID id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + id));
    }

    public boolean isMember(UUID conversationId, UUID userId) {
        return memberRepository.existsByConversationIdAndUserId(conversationId, userId);
    }

    @Transactional
    public void markAsRead(UUID conversationId, UUID userId) {
        memberRepository.findByConversationIdAndUserId(conversationId, userId).ifPresent(member -> {
            Instant now = Instant.now();
            if (member.getLastReadAt() != null && !now.isAfter(member.getLastReadAt())) return;

            member.setLastReadAt(now);
            memberRepository.save(member);

            messageRepository.markMessagesRead(conversationId, userId, now);

            ReadReceiptEvent event = new ReadReceiptEvent(conversationId, userId, now);
            eventPublisher.publishToConversation(conversationId, "conversation.read", event);
            log.debug("Read receipt: user={} conv={} at={}", userId, conversationId, now);
        });
    }
}
