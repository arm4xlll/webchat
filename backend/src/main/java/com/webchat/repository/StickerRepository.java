package com.webchat.repository;

import com.webchat.model.Sticker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StickerRepository extends JpaRepository<Sticker, UUID> {
    // findById(UUID) из JpaRepository достаточно для Use Case 4 (getStickerForMessage)
}
