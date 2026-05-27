package com.webchat.repository;

import com.webchat.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT c FROM Conversation c JOIN c.members m WHERE m.user.id = :userId")
    List<Conversation> findByMemberUserId(@Param("userId") UUID userId);

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.type = 'direct'
              AND EXISTS (SELECT m FROM ConversationMember m WHERE m.conversation = c AND m.user.id = :userId1)
              AND EXISTS (SELECT m FROM ConversationMember m WHERE m.conversation = c AND m.user.id = :userId2)
              AND (SELECT COUNT(m) FROM ConversationMember m WHERE m.conversation = c) = 2
            """)
    Optional<Conversation> findDirectConversation(@Param("userId1") UUID userId1,
                                                   @Param("userId2") UUID userId2);

    @Query("""
            SELECT c FROM Conversation c
            JOIN c.members m
            WHERE c.type = 'saved'
              AND m.user.id = :userId
            """)
    Optional<Conversation> findSavedConversation(@Param("userId") UUID userId);
}
