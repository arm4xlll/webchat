package com.webchat.service;

import com.webchat.dto.response.MessageEventResponse;
import com.webchat.dto.response.MessageResponse;
import com.webchat.model.Message;
import com.webchat.model.MessageReaction;
import com.webchat.model.User;
import com.webchat.repository.MessageReactionRepository;
import com.webchat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReactionService {

    private final MessageReactionRepository reactionRepository;
    private final MessageRepository messageRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void toggleReaction(UUID userId, UUID messageId, String emoji) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        Optional<MessageReaction> existing =
                reactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, userId, emoji);

        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            log.info("Reaction removed: msg={} user={} emoji={}", messageId, userId, emoji);
        } else {
            User user = userService.getEntityById(userId);
            reactionRepository.save(MessageReaction.builder()
                    .message(message)
                    .user(user)
                    .emoji(emoji)
                    .build());
            log.info("Reaction added: msg={} user={} emoji={}", messageId, userId, emoji);
        }

        Map<String, List<UUID>> reactions = buildReactionsMap(messageId);
        MessageResponse response = MessageResponse.from(message, reactions);

        messagingTemplate.convertAndSend(
                "/topic/conversation." + message.getConversation().getId() + ".event",
                new MessageEventResponse("REACTION", response)
        );
    }

    public Map<String, List<UUID>> buildReactionsMap(UUID messageId) {
        return reactionRepository.findByMessageId(messageId).stream()
                .collect(Collectors.groupingBy(
                        MessageReaction::getEmoji,
                        Collectors.mapping(r -> r.getUser().getId(), Collectors.toList())
                ));
    }

    /** Batch load reactions for a list of messages → avoids N+1 */
    public Map<UUID, Map<String, List<UUID>>> buildReactionsMapForMessages(List<UUID> messageIds) {
        if (messageIds.isEmpty()) return Map.of();
        return reactionRepository.findByMessageIdIn(messageIds).stream()
                .collect(Collectors.groupingBy(
                        r -> r.getMessage().getId(),
                        Collectors.groupingBy(
                                MessageReaction::getEmoji,
                                Collectors.mapping(r -> r.getUser().getId(), Collectors.toList())
                        )
                ));
    }
}
