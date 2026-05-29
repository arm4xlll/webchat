package com.webchat.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stickers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sticker {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private StickerPack pack;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    /** MIME-тип оригинального файла: image/webp, video/mp4 и т.д. */
    @Column(name = "content_type", nullable = false, length = 64)
    private String contentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 8)
    private StickerType mediaType;

    @Column(name = "file_size")
    private Long fileSize;

    /**
     * Эмодзи через запятую: "😂,🤣,😄"
     * Нужны для поиска стикера по эмодзи на фронте.
     */
    @Column(nullable = false, length = 255)
    @Builder.Default
    private String emojis = "";

    /**
     * Порядковая позиция в паке.
     * Управляется Hibernate через @OrderColumn(name = "position") в StickerPack.
     * Объявлять отдельным полем не нужно — Hibernate ведёт колонку сам.
     */

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
