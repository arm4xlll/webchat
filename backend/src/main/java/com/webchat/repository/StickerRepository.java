package com.webchat.repository;

import com.webchat.model.Sticker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StickerRepository extends JpaRepository<Sticker, UUID> {

    @Query("""
            SELECT DISTINCT s FROM Sticker s
            JOIN s.emojis e
            WHERE s.pack.id = :packId AND e = :emoji
            ORDER BY s.position
            """)
    List<Sticker> findByPackIdAndEmoji(@Param("packId") UUID packId, @Param("emoji") String emoji);

    int countByPackId(UUID packId);
}
