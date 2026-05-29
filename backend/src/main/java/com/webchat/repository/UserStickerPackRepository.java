package com.webchat.repository;

import com.webchat.model.UserStickerPack;
import com.webchat.model.UserStickerPackId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface UserStickerPackRepository extends JpaRepository<UserStickerPack, UserStickerPackId> {

    @Query("""
            SELECT usp FROM UserStickerPack usp
            JOIN FETCH usp.pack p
            LEFT JOIN FETCH p.stickers
            WHERE usp.userId = :userId
            ORDER BY usp.position
            """)
    List<UserStickerPack> findByUserIdOrderByPosition(@Param("userId") UUID userId);

    boolean existsByUserIdAndPackId(UUID userId, UUID packId);

    int countByUserId(UUID userId);

    @Modifying
    @Query("UPDATE UserStickerPack usp SET usp.position = :position WHERE usp.userId = :userId AND usp.packId = :packId")
    void updatePosition(@Param("userId") UUID userId, @Param("packId") UUID packId, @Param("position") int position);
}
