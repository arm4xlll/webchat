package com.webchat.service;

import com.webchat.dto.request.SendMessageRequest;
import com.webchat.dto.response.MessageResponse;
import com.webchat.model.Conversation;
import com.webchat.model.Message;
import com.webchat.model.User;
import com.webchat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationService conversationService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public MessageResponse sendMessage(UUID senderId, SendMessageRequest req) {
        Conversation conv = conversationService.getEntityById(req.conversationId());

        if (!conversationService.isMember(conv.getId(), senderId)) {
            throw new SecurityException("User is not a member of conversation " + conv.getId());
        }

        User sender = userService.getEntityById(senderId);
        Message message = Message.builder()
                .conversation(conv)
                .sender(sender)
                .content(req.content())
                .build();
        messageRepository.save(message);

        MessageResponse response = MessageResponse.from(message);
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conv.getId(),
                response
        );
        log.info("Message sent: convId={} senderId={} msgId={}", conv.getId(), senderId, message.getId());
        return response;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(UUID conversationId, UUID userId, int page, int size) {
        if (!conversationService.isMember(conversationId, userId)) {
            throw new SecurityException("User is not a member of conversation " + conversationId);
        }
        List<MessageResponse> messages = messageRepository
                .findByConversationId(conversationId, PageRequest.of(page, size))
                .stream()
                .map(MessageResponse::from)
                .toList();

        // Return in chronological order (oldest first)
        List<MessageResponse> result = new java.util.ArrayList<>(messages);
        Collections.reverse(result);
        return result;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getAfter(UUID conversationId, UUID userId, Instant after) {
        if (!conversationService.isMember(conversationId, userId)) {
            throw new SecurityException("User is not a member of conversation " + conversationId);
        }
        return messageRepository.findAfter(conversationId, after).stream()
                .map(MessageResponse::from)
                .toList();
    }
}
