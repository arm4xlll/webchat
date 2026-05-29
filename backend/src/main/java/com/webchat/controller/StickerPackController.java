package com.webchat.controller;

import com.webchat.model.StickerPack;
import com.webchat.security.UserPrincipal;
import com.webchat.service.StickerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stickers/packs")
@RequiredArgsConstructor
public class StickerPackController {

    private final StickerService stickerService;

    /** Паки текущего пользователя в порядке вкладок. */
    @GetMapping("/my")
    public ResponseEntity<List<StickerPack>> getMyPacks(
            @AuthenticationPrincipal UserPrincipal principal) {
        // TODO: вернуть DTO вместо сущности
        return ResponseEntity.ok(List.of());
    }

    /** Полный пак со стикерами по slug (для показа и подписки). */
    @GetMapping("/{slug}")
    public ResponseEntity<StickerPack> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(stickerService.getPackBySlug(slug));
    }

    /** Добавить чужой пак в свою коллекцию. */
    @PostMapping("/{slug}/subscribe")
    public ResponseEntity<Void> subscribe(
            @PathVariable String slug,
            @AuthenticationPrincipal UserPrincipal principal) {
        stickerService.addPackToUserCollection(principal.getUserId(), slug);
        return ResponseEntity.ok().build();
    }

    /** Валидировать стикер и получить данные для рендеринга. */
    @GetMapping("/stickers/{stickerId}")
    public ResponseEntity<StickerService.StickerMessageData> getStickerData(
            @PathVariable UUID stickerId) {
        return ResponseEntity.ok(stickerService.getStickerForMessage(stickerId));
    }
}
