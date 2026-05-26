package com.webchat.repository;

import com.webchat.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :convId AND m.deleted = false ORDER BY m.createdAt DESC")
    Page<Message> findByConversationId(@Param("convId") UUID conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :convId AND m.createdAt > :after AND m.deleted = false ORDER BY m.createdAt ASC")
    List<Message> findAfter(@Param("convId") UUID conversationId, @Param("after") Instant after);
}
