package com.webchat.controller;

import com.webchat.dto.request.CreateStickerPackRequest;
import com.webchat.dto.response.StickerPackResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.StickerPackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stickers/packs")
@RequiredArgsConstructor
public class StickerPackController {

    private final StickerPackService stickerPackService;

    @GetMapping("/my")
    public ResponseEntity<List<StickerPackResponse>> getMyPacks(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(stickerPackService.getUserPacks(principal.getUserId()));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<StickerPackResponse> getBySlug(
            @PathVariable String slug) {
        return ResponseEntity.ok(stickerPackService.getPackBySlug(slug));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StickerPackResponse> createPack(
            @RequestPart("metadata") CreateStickerPackRequest metadata,
            @RequestPart("files") List<MultipartFile> files,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stickerPackService.createPack(metadata, files, principal.getUserId()));
    }

    @PostMapping("/{slug}/subscribe")
    public ResponseEntity<Void> subscribe(
            @PathVariable String slug,
            @AuthenticationPrincipal UserPrincipal principal) {
        stickerPackService.subscribeToPack(slug, principal.getUserId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/subscriptions/{packId}")
    public ResponseEntity<Void> unsubscribe(
            @PathVariable UUID packId,
            @AuthenticationPrincipal UserPrincipal principal) {
        stickerPackService.unsubscribeFromPack(packId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody List<UUID> orderedPackIds,
            @AuthenticationPrincipal UserPrincipal principal) {
        stickerPackService.reorderUserPacks(principal.getUserId(), orderedPackIds);
        return ResponseEntity.ok().build();
    }
}
