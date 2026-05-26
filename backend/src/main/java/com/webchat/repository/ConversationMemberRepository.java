package com.webchat.repository;

import com.webchat.model.ConversationMember;
import com.webchat.model.ConversationMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationMemberRepository extends JpaRepository<ConversationMember, ConversationMemberId> {

    @Query("SELECT cm FROM ConversationMember cm WHERE cm.conversation.id = :convId AND cm.user.id = :userId")
    Optional<ConversationMember> findByConversationIdAndUserId(
            @Param("convId") UUID conversationId,
            @Param("userId") UUID userId
    );

    @Query("SELECT COUNT(cm) > 0 FROM ConversationMember cm WHERE cm.conversation.id = :convId AND cm.user.id = :userId")
    boolean existsByConversationIdAndUserId(
            @Param("convId") UUID conversationId,
            @Param("userId") UUID userId
    );

    @Query("SELECT cm FROM ConversationMember cm WHERE cm.conversation.id = :convId")
    List<ConversationMember> findAllByConversationId(@Param("convId") UUID conversationId);

    @Query("SELECT DISTINCT cm2.user.id FROM ConversationMember cm1 " +
           "JOIN ConversationMember cm2 ON cm1.conversation = cm2.conversation " +
           "WHERE cm1.user.id = :userId AND cm2.user.id != :userId")
    List<UUID> findContactIdsByUserId(@Param("userId") UUID userId);

    @Query("SELECT cm.conversation.id FROM ConversationMember cm WHERE cm.user.id = :userId")
    List<UUID> findConversationIdsByUserId(@Param("userId") UUID userId);
}
