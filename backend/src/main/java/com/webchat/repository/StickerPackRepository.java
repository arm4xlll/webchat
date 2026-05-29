package com.webchat.repository;

import com.webchat.model.StickerPack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface StickerPackRepository extends JpaRepository<StickerPack, UUID> {

    boolean existsBySlug(String slug);

    Optional<StickerPack> findBySlug(String slug);

    @Query("SELECT sp FROM StickerPack sp LEFT JOIN FETCH sp.stickers WHERE sp.slug = :slug")
    Optional<StickerPack> findBySlugWithStickers(@Param("slug") String slug);

    @Query("SELECT sp FROM StickerPack sp LEFT JOIN FETCH sp.stickers WHERE sp.id = :id")
    Optional<StickerPack> findByIdWithStickers(@Param("id") UUID id);
}
