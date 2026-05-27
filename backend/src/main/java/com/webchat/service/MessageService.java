package com.webchat.service;

import com.webchat.dto.request.SendMessageRequest;
import com.webchat.dto.response.MessageResponse;
import com.webchat.model.Conversation;
import com.webchat.model.Message;
import com.webchat.model.User;
import com.webchat.repository.MessageRepository;
import com.webchat.sse.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationService conversationService;
    private final UserService userService;
    private final ReactionService reactionService;
    private final EventPublisher eventPublisher;
    private final PushNotificationService pushNotificationService;

    @Transactional
    public MessageResponse sendMessage(UUID senderId, SendMessageRequest req) {
        Conversation conv = conversationService.getEntityById(req.conversationId());

        if (!conversationService.isMember(conv.getId(), senderId)) {
            throw new SecurityException("User is not a member of conversation " + conv.getId());
        }

        String content = (req.content() == null || req.content().isBlank()) ? "" : req.content();
        boolean hasFile = req.fileUrl() != null && !req.fileUrl().isBlank();
        if (content.isBlank() && !hasFile) {
            throw new IllegalArgumentException("Message must have content or attachment");
        }

        User sender = userService.getEntityById(senderId);

        Message replyTo = null;
        if (req.replyToId() != null) {
            replyTo = messageRepository.findById(req.replyToId()).orElse(null);
        }

        Message message = Message.builder()
                .conversation(conv)
                .sender(sender)
                .content(content)
                .fileUrl(req.fileUrl())
                .fileName(req.fileName())
                .fileType(req.fileType())
                .fileSize(req.fileSize())
                .replyTo(replyTo)
                .build();
        messageRepository.save(message);

        conv.setLastMessageAt(message.getCreatedAt());

        MessageResponse response = MessageResponse.from(message);
        eventPublisher.publishToConversation(conv.getId(), "message.created", response);
        log.info("Message sent: convId={} senderId={} msgId={}", conv.getId(), senderId, message.getId());

        for (var member : conv.getMembers()) {
            if (!member.getUser().getId().equals(senderId)) {
                pushNotificationService.sendPushToUser(
                        member.getUser().getId(),
                        sender.getName(),
                        content.isBlank() ? "Вложение" : content,
                        Map.of("conversationId", conv.getId().toString())
                );
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(UUID conversationId, UUID userId, int page, int size) {
        if (!conversationService.isMember(conversationId, userId)) {
            throw new SecurityException("User is not a member of conversation " + conversationId);
        }
        List<Message> messages = messageRepository
                .findByConversationId(conversationId, userId, PageRequest.of(page, size))
                .stream()
                .toList();

        List<UUID> ids = messages.stream().map(Message::getId).toList();
        Map<UUID, Map<String, List<UUID>>> reactionsMap = reactionService.buildReactionsMapForMessages(ids);

        List<MessageResponse> result = messages.stream()
                .map(m -> MessageResponse.from(m, reactionsMap.getOrDefault(m.getId(), Map.of())))
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));

        Collections.reverse(result);
        return result;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getAfter(UUID conversationId, UUID userId, Instant after) {
        if (!conversationService.isMember(conversationId, userId)) {
            throw new SecurityException("User is not a member of conversation " + conversationId);
        }
        List<Message> messages = messageRepository.findAfter(conversationId, after, userId);

        List<UUID> ids = messages.stream().map(Message::getId).toList();
        Map<UUID, Map<String, List<UUID>>> reactionsMap = reactionService.buildReactionsMapForMessages(ids);

        return messages.stream()
                .map(m -> MessageResponse.from(m, reactionsMap.getOrDefault(m.getId(), Map.of())))
                .toList();
    }

    @Transactional
    public MessageResponse editMessage(UUID userId, UUID messageId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        if (!message.getSender().getId().equals(userId)) {
            throw new SecurityException("Not the message sender");
        }
        if (message.isDeleted()) {
            throw new IllegalArgumentException("Cannot edit deleted message");
        }

        message.setContent(newContent.trim());
        message.setEditedAt(Instant.now());
        messageRepository.save(message);

        Map<String, List<UUID>> reactions = reactionService.buildReactionsMap(messageId);
        MessageResponse response = MessageResponse.from(message, reactions);
        eventPublisher.publishToConversation(
                message.getConversation().getId(), "message.updated", response);
        log.info("Message edited: msgId={} by userId={}", messageId, userId);
        return response;
    }

    @Transactional
    public void deleteMessage(UUID userId, UUID messageId, boolean forEveryone) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        if (!message.getSender().getId().equals(userId)) {
            throw new SecurityException("Not the message sender");
        }

        if (forEveryone) {
            message.setDeleted(true);
            message.setContent("");
            message.setFileUrl(null);
            message.setFileName(null);
            message.setFileType(null);
            message.setFileSize(null);
            messageRepository.save(message);

            MessageResponse response = MessageResponse.from(message);
            eventPublisher.publishToConversation(
                    message.getConversation().getId(), "message.deleted", response);
            log.info("Message deleted for everyone: msgId={} by userId={}", messageId, userId);
        } else {
            message.setDeletedForSender(true);
            messageRepository.save(message);
            log.info("Message deleted for sender: msgId={} by userId={}", messageId, userId);
        }
    }
}
