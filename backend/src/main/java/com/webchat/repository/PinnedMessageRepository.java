package com.webchat.repository;

import com.webchat.model.PinnedMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PinnedMessageRepository extends JpaRepository<PinnedMessage, UUID> {

    List<PinnedMessage> findByConversationIdAndPinnedForAllTrue(UUID convId);

    List<PinnedMessage> findByConversationIdAndPinnedByIdAndPinnedForAllFalse(UUID convId, UUID userId);

    List<PinnedMessage> findByConversationIdInAndPinnedForAllTrue(Collection<UUID> convIds);

    List<PinnedMessage> findByConversationIdInAndPinnedByIdAndPinnedForAllFalse(Collection<UUID> convIds, UUID userId);

    Optional<PinnedMessage> findByConversationIdAndMessageIdAndPinnedById(UUID convId, UUID msgId, UUID userId);

    boolean existsByConversationIdAndMessageIdAndPinnedById(UUID convId, UUID msgId, UUID userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM PinnedMessage p WHERE p.conversation.id = :convId AND p.message.id = :msgId AND p.pinnedBy.id = :userId")
    void deletePin(@Param("convId") UUID convId, @Param("msgId") UUID msgId, @Param("userId") UUID userId);
}
