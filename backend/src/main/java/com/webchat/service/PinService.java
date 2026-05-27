package com.webchat.service;

import com.webchat.dto.response.PinnedMessageResponse;
import com.webchat.model.Message;
import com.webchat.model.PinnedMessage;
import com.webchat.model.User;
import com.webchat.repository.MessageRepository;
import com.webchat.repository.PinnedMessageRepository;
import com.webchat.sse.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PinService {

    private final PinnedMessageRepository pinnedMessageRepository;
    private final ConversationService conversationService;
    private final MessageRepository messageRepository;
    private final EventPublisher eventPublisher;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<PinnedMessageResponse> getPins(UUID conversationId, UUID userId) {
        List<PinnedMessage> forAll = pinnedMessageRepository.findByConversationIdAndPinnedForAllTrue(conversationId);
        List<PinnedMessage> personal = pinnedMessageRepository
                .findByConversationIdAndPinnedByIdAndPinnedForAllFalse(conversationId, userId);

        List<PinnedMessage> combined = new ArrayList<>();
        combined.addAll(forAll);
        combined.addAll(personal);

        return combined.stream()
                .sorted(Comparator.comparing(PinnedMessage::getCreatedAt))
                .map(PinnedMessageResponse::from)
                .toList();
    }

    @Transactional
    public PinnedMessageResponse pin(UUID conversationId, UUID userId, UUID messageId, boolean pinnedForAll) {
        if (!conversationService.isMember(conversationId, userId)) {
            throw new SecurityException("User is not a member of conversation " + conversationId);
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        if (!message.getConversation().getId().equals(conversationId)) {
            throw new IllegalArgumentException("Message does not belong to this conversation");
        }

        if (pinnedMessageRepository.existsByConversationIdAndMessageIdAndPinnedById(conversationId, messageId, userId)) {
            throw new IllegalStateException("Message already pinned by this user");
        }

        User pinnedBy = userService.getEntityById(userId);
        var conv = conversationService.getEntityById(conversationId);

        PinnedMessage pin = PinnedMessage.builder()
                .conversation(conv)
                .message(message)
                .pinnedBy(pinnedBy)
                .pinnedForAll(pinnedForAll)
                .build();
        pinnedMessageRepository.save(pin);

        PinnedMessageResponse response = PinnedMessageResponse.from(pin);

        if (pinnedForAll) {
            eventPublisher.publishToConversation(conversationId, "conversation.pin_added", response);
        } else {
            eventPublisher.publishToUser(userId, "conversation.pin_added", response);
        }

        log.info("Message pinned: convId={} msgId={} by userId={} forAll={}", conversationId, messageId, userId, pinnedForAll);
        return response;
    }

    @Transactional
    public void unpin(UUID conversationId, UUID userId, UUID pinId) {
        PinnedMessage pin = pinnedMessageRepository.findById(pinId)
                .orElseThrow(() -> new IllegalArgumentException("Pin not found: " + pinId));

        if (!pin.getPinnedBy().getId().equals(userId)) {
            throw new SecurityException("Cannot unpin a pin created by another user");
        }

        pinnedMessageRepository.delete(pin);

        eventPublisher.publishToConversation(conversationId, "conversation.pin_removed",
                Map.of("pinId", pinId, "conversationId", conversationId));

        log.info("Pin removed: pinId={} convId={} by userId={}", pinId, conversationId, userId);
    }
}
