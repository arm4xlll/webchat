package com.webchat.repository;

import com.webchat.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversation.id = :convId
            AND NOT (m.deletedForSender = true AND m.sender.id = :userId)
            ORDER BY m.createdAt DESC
            """)
    Page<Message> findByConversationId(@Param("convId") UUID conversationId,
                                       @Param("userId") UUID userId,
                                       Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversation.id = :convId
            AND m.createdAt > :after
            AND NOT (m.deletedForSender = true AND m.sender.id = :userId)
            ORDER BY m.createdAt ASC
            """)
    List<Message> findAfter(@Param("convId") UUID conversationId,
                            @Param("after") Instant after,
                            @Param("userId") UUID userId);

    @Modifying
    @Query("""
            UPDATE Message m SET m.readAt = :readAt
            WHERE m.conversation.id = :convId
              AND m.sender.id != :readerId
              AND m.createdAt <= :readAt
              AND m.readAt IS NULL
            """)
    int markMessagesRead(@Param("convId") UUID convId,
                         @Param("readerId") UUID readerId,
                         @Param("readAt") Instant readAt);
}
