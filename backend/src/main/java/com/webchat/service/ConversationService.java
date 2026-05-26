package com.webchat.service;

import com.webchat.dto.response.ConversationResponse;
import com.webchat.dto.response.ReadReceiptEvent;
import com.webchat.dto.response.UserResponse;
import com.webchat.model.Conversation;
import com.webchat.model.ConversationMember;
import com.webchat.model.User;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ConversationResponse> getForUser(UUID userId) {
        return conversationRepository.findByMemberUserId(userId).stream()
                .map(ConversationResponse::from)
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

                    // Сохраняем только через repository — не добавляем в conv.getMembers()
                    // чтобы избежать дублирования при flush (NonUniqueObjectException)
                    memberRepository.save(ConversationMember.builder()
                            .conversation(conv).user(currentUser).build());
                    memberRepository.save(ConversationMember.builder()
                            .conversation(conv).user(targetUser).build());

                    log.info("Created direct conversation {} between {} and {}",
                            conv.getId(), currentUserId, targetUserId);

                    // Строим DTO вручную, не через conv.getMembers() (которые ещё не подгружены)
                    return new ConversationResponse(
                            conv.getId(),
                            conv.getType(),
                            List.of(UserResponse.from(currentUser), UserResponse.from(targetUser)),
                            conv.getCreatedAt()
                    );
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
            member.setLastReadAt(now);
            memberRepository.save(member);

            ReadReceiptEvent event = new ReadReceiptEvent(conversationId, userId, now);
            messagingTemplate.convertAndSend(
                    "/topic/conversation." + conversationId + ".read", event);
            log.debug("Read receipt: user={} conv={} at={}", userId, conversationId, now);
        });
    }
}
