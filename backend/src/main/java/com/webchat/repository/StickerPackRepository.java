package com.webchat.repository;

import com.webchat.model.StickerPack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface StickerPackRepository extends JpaRepository<StickerPack, UUID> {

    boolean existsBySlug(String slug);

    /** Для Use Case 3: addPackToUserCollection — нужен только pack, без стикеров. */
    Optional<StickerPack> findBySlug(String slug);

    /** Для Use Case 2: getPackBySlug — загружает пак вместе со стикерами и создателем. */
    @Query("SELECT p FROM StickerPack p LEFT JOIN FETCH p.stickers LEFT JOIN FETCH p.creator WHERE p.slug = :slug")
    Optional<StickerPack> findBySlugWithStickers(@Param("slug") String slug);
}
