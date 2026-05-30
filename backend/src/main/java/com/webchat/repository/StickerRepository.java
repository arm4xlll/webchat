package com.webchat.repository;

import com.webchat.model.Sticker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface StickerRepository extends JpaRepository<Sticker, UUID> {

    @Query("SELECT s FROM Sticker s JOIN FETCH s.pack p JOIN FETCH p.creator WHERE s.fileUrl = :fileUrl")
    Optional<Sticker> findByFileUrlWithPack(@Param("fileUrl") String fileUrl);
}
