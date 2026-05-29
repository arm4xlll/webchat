package com.webchat.controller;

import com.webchat.dto.response.StickerPackResponse;
import com.webchat.model.StickerPack;
import com.webchat.security.UserPrincipal;
import com.webchat.service.StickerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@RestController
@RequestMapping("/api/stickers/packs")
@RequiredArgsConstructor
public class StickerPackController {

    private final StickerService stickerService;

    /** Паки текущего пользователя в порядке вкладок (без стикеров — только метаданные). */
    @GetMapping("/my")
    public ResponseEntity<List<StickerPackResponse>> getMyPacks(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<StickerPackResponse> result = stickerService.getUserPacks(principal.getUserId())
                .stream()
                .map(StickerPackResponse::summary)
                .toList();
        return ResponseEntity.ok(result);
    }

    /** Полный пак со стикерами по slug — используется при открытии вкладки. */
    @GetMapping("/{slug}")
    public ResponseEntity<StickerPackResponse> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(StickerPackResponse.from(stickerService.getPackBySlug(slug)));
    }

    /**
     * Создать новый стикерпак.
     * Multipart-запрос: part "metadata" (JSON) + part "files" (массив файлов).
     * Порядок файлов совпадает с порядком элементов metadata.stickers[].
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StickerPackResponse> createPack(
            @RequestPart("metadata") CreatePackRequest metadata,
            @RequestPart("files") List<MultipartFile> files,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<StickerService.StickerUpload> uploads = IntStream.range(0, files.size())
                .mapToObj(i -> {
                    String emojis = (metadata.stickers() != null && i < metadata.stickers().size())
                            ? metadata.stickers().get(i).emojis()
                            : "";
                    return new StickerService.StickerUpload(files.get(i), emojis);
                })
                .toList();

        StickerPack pack = stickerService.createPack(
                principal.getUserId(), metadata.title(), metadata.slug(), uploads);

        return ResponseEntity.status(HttpStatus.CREATED).body(StickerPackResponse.from(pack));
    }

    /** Добавить чужой пак в свою коллекцию по slug. */
    @PostMapping("/{slug}/subscribe")
    public ResponseEntity<Void> subscribe(
            @PathVariable String slug,
            @AuthenticationPrincipal UserPrincipal principal) {
        stickerService.addPackToUserCollection(principal.getUserId(), slug);
        return ResponseEntity.ok().build();
    }

    /** Валидировать стикер и получить fileUrl + mediaType для рендеринга. */
    @GetMapping("/stickers/{stickerId}")
    public ResponseEntity<StickerService.StickerMessageData> getStickerData(
            @PathVariable UUID stickerId) {
        return ResponseEntity.ok(stickerService.getStickerForMessage(stickerId));
    }

    // ── Request DTO ──────────────────────────────────────────────────────────

    public record CreatePackRequest(
            String slug,
            String title,
            List<StickerMeta> stickers
    ) {
        public record StickerMeta(String emojis) {}
    }
}
