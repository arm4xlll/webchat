package com.webchat.repository;

import com.webchat.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SessionRepository extends JpaRepository<Session, UUID> {

    @Query("SELECT s FROM Session s WHERE s.user.id = :userId AND s.revokedAt IS NULL ORDER BY s.primary DESC, s.lastActiveAt DESC")
    List<Session> findActiveByUserId(@Param("userId") UUID userId);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.user.id = :userId AND s.revokedAt IS NULL")
    long countActiveByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE Session s SET s.lastActiveAt = :now WHERE s.id = :id AND s.revokedAt IS NULL")
    void updateLastActiveAt(@Param("id") UUID id, @Param("now") Instant now);
}
