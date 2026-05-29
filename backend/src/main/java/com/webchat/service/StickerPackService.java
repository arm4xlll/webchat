package com.webchat.service;

import com.webchat.dto.request.CreateStickerPackRequest;
import com.webchat.dto.response.StickerPackResponse;
import com.webchat.model.*;
import com.webchat.repository.StickerPackRepository;
import com.webchat.repository.StickerRepository;
import com.webchat.repository.UserRepository;
import com.webchat.repository.UserStickerPackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StickerPackService {

    private final StickerPackRepository stickerPackRepository;
    private final StickerRepository stickerRepository;
    private final UserStickerPackRepository userStickerPackRepository;
    private final UserRepository userRepository;
    private final StickerStorageService storageService;
    private final StickerFileValidator validator;

    /**
     * Атомарно создаёт стикерпак со всеми стикерами.
     * Файлы сохраняются в оригинальном виде без обработки.
     * <p>
     * Порядок элементов {@code files} должен совпадать с
     * {@code request.stickers()} — index N файла = index N метаданных.
     */
    @Transactional
    public StickerPackResponse createPack(CreateStickerPackRequest request,
                                          List<MultipartFile> files,
                                          UUID creatorId) {
        validateCreateRequest(request, files);

        if (stickerPackRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Sticker pack slug already taken: " + request.slug());
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + creatorId));

        StickerPack pack = StickerPack.builder()
                .slug(request.slug())
                .name(request.name())
                .isPublic(request.isPublic())
                .creator(creator)
                .build();

        List<Sticker> stickers = new ArrayList<>();
        List<String> savedUrls = new ArrayList<>();

        try {
            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);
                StickerType type = validator.validateAndDetect(file);
                String url = storageService.store(file, request.slug());
                savedUrls.add(url);

                List<String> emojis = request.stickers() != null && i < request.stickers().size()
                        ? request.stickers().get(i).emojis()
                        : List.of();

                Sticker sticker = Sticker.builder()
                        .pack(pack)
                        .fileUrl(url)
                        .contentType(file.getContentType())
                        .mediaType(type)
                        .fileSize(file.getSize())
                        .emojis(new ArrayList<>(emojis))
                        .position(i)
                        .build();

                stickers.add(sticker);
            }
        } catch (IOException | IllegalArgumentException e) {
            // Откатываем уже сохранённые файлы при ошибке
            savedUrls.forEach(storageService::delete);
            throw new RuntimeException("Failed to store sticker files: " + e.getMessage(), e);
        }

        pack.getStickers().addAll(stickers);
        if (!stickers.isEmpty()) {
            pack.setThumbnailUrl(stickers.get(0).getFileUrl());
        }

        StickerPack saved = stickerPackRepository.save(pack);

        // Автоматически добавляем пак в коллекцию создателя
        subscribeInternal(creator.getId(), saved, 0);

        log.info("Sticker pack created: slug={}, stickers={}, creator={}", saved.getSlug(), stickers.size(), creatorId);
        return StickerPackResponse.from(saved);
    }

    /**
     * Добавляет отдельный стикер в уже существующий пак.
     * Доступно только создателю пака.
     */
    @Transactional
    public StickerPackResponse addSticker(UUID packId,
                                          MultipartFile file,
                                          List<String> emojis,
                                          UUID requesterId) {
        StickerPack pack = stickerPackRepository.findByIdWithStickers(packId)
                .orElseThrow(() -> new IllegalArgumentException("Sticker pack not found: " + packId));

        if (!pack.getCreator().getId().equals(requesterId)) {
            throw new SecurityException("Only the pack creator can add stickers");
        }

        StickerType type = validator.validateAndDetect(file);
        String url;
        try {
            url = storageService.store(file, pack.getSlug());
        } catch (IOException e) {
            throw new RuntimeException("Failed to store sticker file", e);
        }

        int nextPosition = pack.getStickers().size();
        Sticker sticker = Sticker.builder()
                .pack(pack)
                .fileUrl(url)
                .contentType(file.getContentType())
                .mediaType(type)
                .fileSize(file.getSize())
                .emojis(emojis != null ? new ArrayList<>(emojis) : new ArrayList<>())
                .position(nextPosition)
                .build();

        pack.getStickers().add(sticker);

        if (pack.getThumbnailUrl() == null) {
            pack.setThumbnailUrl(url);
        }

        return StickerPackResponse.from(stickerPackRepository.save(pack));
    }

    /**
     * Подписывает пользователя на чужой пак по slug.
     * Пак добавляется в конец списка вкладок пользователя.
     */
    @Transactional
    public void subscribeToPack(String slug, UUID userId) {
        StickerPack pack = stickerPackRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Sticker pack not found: " + slug));

        if (!pack.isPublic() && !pack.getCreator().getId().equals(userId)) {
            throw new SecurityException("This sticker pack is private");
        }

        if (userStickerPackRepository.existsByUserIdAndPackId(userId, pack.getId())) {
            return; // уже добавлен — идемпотентно
        }

        int position = userStickerPackRepository.countByUserId(userId);
        subscribeInternal(userId, pack, position);
        log.info("User {} subscribed to sticker pack {}", userId, slug);
    }

    /**
     * Отписывает пользователя от пака.
     */
    @Transactional
    public void unsubscribeFromPack(UUID packId, UUID userId) {
        UserStickerPackId id = new UserStickerPackId();
        id.setUserId(userId);
        id.setPackId(packId);
        userStickerPackRepository.deleteById(id);
    }

    /**
     * Переставляет вкладки стикерпаков для пользователя.
     * {@code orderedPackIds} — полный список ID паков в нужном порядке.
     */
    @Transactional
    public void reorderUserPacks(UUID userId, List<UUID> orderedPackIds) {
        for (int i = 0; i < orderedPackIds.size(); i++) {
            userStickerPackRepository.updatePosition(userId, orderedPackIds.get(i), i);
        }
    }

    /**
     * Возвращает паки пользователя в порядке его вкладок (без стикеров — сводка).
     */
    @Transactional(readOnly = true)
    public List<StickerPackResponse> getUserPacks(UUID userId) {
        return userStickerPackRepository.findByUserIdOrderByPosition(userId).stream()
                .map(usp -> StickerPackResponse.summary(usp.getPack()))
                .toList();
    }

    /**
     * Возвращает полный пак со всеми стикерами по slug.
     */
    @Transactional(readOnly = true)
    public StickerPackResponse getPackBySlug(String slug) {
        StickerPack pack = stickerPackRepository.findBySlugWithStickers(slug)
                .orElseThrow(() -> new IllegalArgumentException("Sticker pack not found: " + slug));
        return StickerPackResponse.from(pack);
    }

    // --- internal ---

    private void subscribeInternal(UUID userId, StickerPack pack, int position) {
        UserStickerPack entry = UserStickerPack.builder()
                .userId(userId)
                .packId(pack.getId())
                .pack(pack)
                .position(position)
                .build();
        userStickerPackRepository.save(entry);
    }

    private void validateCreateRequest(CreateStickerPackRequest request, List<MultipartFile> files) {
        if (request.slug() == null || !request.slug().matches("^[a-z0-9_-]{3,64}$")) {
            throw new IllegalArgumentException("Slug must be 3-64 chars, lowercase letters, digits, _ or -");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("Pack name must not be blank");
        }
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("At least one sticker file is required");
        }
        if (files.size() > 120) {
            throw new IllegalArgumentException("A pack can contain at most 120 stickers");
        }
        if (request.stickers() != null && request.stickers().size() != files.size()) {
            throw new IllegalArgumentException("Sticker metadata count must match file count");
        }
    }
}
