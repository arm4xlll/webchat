package com.webchat.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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

    // Исходный MIME-тип файла (например: image/webp, video/mp4)
    @Column(name = "content_type", nullable = false, length = 64)
    private String contentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 16)
    private StickerType mediaType;

    @Column(name = "file_size")
    private Long fileSize;

    // position управляется @OrderColumn со стороны StickerPack.stickers
    @Column(name = "position", nullable = false)
    private int position;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "sticker_emojis",
            joinColumns = @JoinColumn(name = "sticker_id")
    )
    @Column(name = "emoji", nullable = false, length = 8)
    @Builder.Default
    private List<String> emojis = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
