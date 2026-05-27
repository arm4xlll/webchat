package com.webchat.repository;

import com.webchat.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    @Query("SELECT r FROM MessageReaction r WHERE r.message.id = :messageId")
    List<MessageReaction> findByMessageId(@Param("messageId") UUID messageId);

    @Query("SELECT r FROM MessageReaction r WHERE r.message.id IN :messageIds")
    List<MessageReaction> findByMessageIdIn(@Param("messageIds") List<UUID> messageIds);
}
