package com.webchat.repository;

import com.webchat.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {
    List<PushSubscription> findByUserId(UUID userId);

    // Bulk JPQL delete — single query, no rollback-only risk from Spring Data's
    // find-then-remove pattern. @Transactional here ensures a TX is always
    // present even when called from a non-transactional context.
    @Transactional
    @Modifying
    @Query("DELETE FROM PushSubscription ps WHERE ps.endpoint = :endpoint")
    int deleteByEndpoint(String endpoint);
}
