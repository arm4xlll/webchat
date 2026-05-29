package com.webchat.service;

import com.webchat.model.Sticker;
import com.webchat.model.StickerPack;
import com.webchat.model.StickerType;
import com.webchat.model.User;
import com.webchat.repository.StickerPackRepository;
import com.webchat.repository.StickerRepository;
import com.webchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StickerService {

    private static final Set<String> ALLOWED_MIME = Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif",
            "video/mp4", "video/quicktime", "video/webm"
    );

    private final StickerPackRepository packRepository;
    private final StickerRepository     stickerRepository;
    private final UserRepository        userRepository;
    private final StorageService        storageService;

    // ── Input / Output records ────────────────────────────────────────────────

    /**
     * Данные одного стикера при создании пака.
     *
     * @param file   исходный файл (PNG, WEBP, MP4 и т.д.) — сохраняется без изменений
     * @param emojis эмодзи через запятую: "😂,🤣,😄"
     */
    public record StickerUpload(MultipartFile file, String emojis) {}

    /**
     * Данные стикера для отправки сообщения.
     * Фронтенд рендерит:
     * - IMAGE → {@code <img src="fileUrl">}
     * - VIDEO → {@code <video src="fileUrl" autoplay loop muted playsinline>}
     */
    public record StickerMessageData(UUID stickerId, String fileUrl, StickerType mediaType) {}

    // ── Use Case 1: Создание пака ─────────────────────────────────────────────

    /**
     * Атомарно создаёт стикерпак и добавляет его первым в коллекцию создателя.
     *
     * <p>Порядок действий:
     * <ol>
     *   <li>Валидация slug на формат и уникальность</li>
     *   <li>Валидация MIME-типа каждого файла</li>
     *   <li>Сохранение файлов через StorageService</li>
     *   <li>Создание StickerPack + Sticker-сущностей и сохранение в БД</li>
     *   <li>Добавление пака первым элементом в user.stickerPacks
     *       (Hibernate сдвигает tab_order остальных паков)</li>
     * </ol>
     *
     * <p>При любой ошибке во время загрузки файлов уже сохранённые файлы откатываются.
     *
     * @param creatorId UUID пользователя-создателя
     * @param title     отображаемое название пака
     * @param slug      уникальный идентификатор для ссылок (3-64 символа, a-z0-9_-)
     * @param uploads   список стикеров (файл + эмодзи)
     * @return сохранённый пак со всеми стикерами
     */
    @Transactional
    public StickerPack createPack(UUID creatorId, String title, String slug, List<StickerUpload> uploads) {
        validateSlugFormat(slug);

        if (packRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("Slug already taken: " + slug);
        }
        if (uploads == null || uploads.isEmpty()) {
            throw new IllegalArgumentException("Pack must contain at least one sticker");
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + creatorId));

        // Валидируем MIME ДО того, как начинаем сохранять файлы
        for (StickerUpload upload : uploads) {
            detectType(upload.file());
        }

        // Сохраняем файлы; если один упадёт — откатываем уже сохранённые
        List<String> savedUrls = new ArrayList<>();
        try {
            for (StickerUpload upload : uploads) {
                savedUrls.add(storageService.save(upload.file()));
            }
        } catch (IOException e) {
            savedUrls.forEach(storageService::delete);
            throw new RuntimeException("Failed to save sticker files", e);
        }

        // Собираем сущности
        StickerPack pack = StickerPack.builder()
                .slug(slug)
                .title(title)
                .creator(creator)
                .build();

        for (int i = 0; i < uploads.size(); i++) {
            MultipartFile file = uploads.get(i).file();
            Sticker sticker = Sticker.builder()
                    .pack(pack)
                    .fileUrl(savedUrls.get(i))
                    .contentType(file.getContentType())
                    .mediaType(detectType(file))
                    .fileSize(file.getSize())
                    .emojis(uploads.get(i).emojis() != null ? uploads.get(i).emojis() : "")
                    .build();
            pack.getStickers().add(sticker);
        }

        StickerPack saved = packRepository.save(pack);

        // Добавляем паком первым элементом — Hibernate автоматически
        // выставит tab_order = 0 для нового и сдвинет существующие на +1
        creator.getStickerPacks().add(0, saved);
        userRepository.save(creator);

        return saved;
    }

    // ── Use Case 0: Список паков пользователя ────────────────────────────────

    /**
     * Возвращает паки пользователя в порядке его вкладок (без стикеров — только slug/title/id).
     * Стикеры каждого пака грузятся отдельно через getPackBySlug при открытии вкладки.
     */
    @Transactional(readOnly = true)
    public List<StickerPack> getUserPacks(UUID userId) {
        return userRepository.findByIdWithStickerPacks(userId)
                .map(User::getStickerPacks)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }

    // ── Use Case 2: Получение пака по slug ────────────────────────────────────

    /**
     * Возвращает пак со всеми стикерами.
     * Используется фронтендом когда юзер кликает на чужой стикер в чате,
     * чтобы показать весь пак и предложить «Добавить».
     *
     * @param slug уникальный адрес пака
     * @return пак со стикерами в порядке добавления
     */
    @Transactional(readOnly = true)
    public StickerPack getPackBySlug(String slug) {
        return packRepository.findBySlugWithStickers(slug)
                .orElseThrow(() -> new IllegalArgumentException("Sticker pack not found: " + slug));
    }

    // ── Use Case 3: Добавление чужого пака в коллекцию ───────────────────────

    /**
     * Добавляет стикерпак в коллекцию пользователя.
     * Новый пак появится ПОСЛЕДНИМ в списке вкладок.
     * Повторный вызов для уже добавленного пака — идемпотентен (ничего не происходит).
     *
     * @param userId UUID пользователя
     * @param slug   slug пака
     */
    @Transactional
    public void addPackToUserCollection(UUID userId, String slug) {
        User user = userRepository.findByIdWithStickerPacks(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        StickerPack pack = packRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Sticker pack not found: " + slug));

        // Идемпотентность: если пак уже есть — ничего не делаем
        boolean alreadyAdded = user.getStickerPacks().stream()
                .anyMatch(p -> p.getId().equals(pack.getId()));
        if (alreadyAdded) {
            return;
        }

        // Добавляем в конец — Hibernate присвоит tab_order = размер списка
        user.getStickerPacks().add(pack);
        userRepository.save(user);
    }

    // ── Use Case 4: Отправка стикера в чат ───────────────────────────────────

    /**
     * Валидирует существование стикера и возвращает данные для рендеринга.
     *
     * <p>Вызывается сервисом сообщений перед сохранением. Гарантирует, что
     * отправляемый stickerId реально существует в БД — фронтенд не может
     * подставить произвольный URL.
     *
     * <p>Фронтенд рендерит по mediaType:
     * <ul>
     *   <li>IMAGE → {@code <img src="fileUrl" loading="lazy">}</li>
     *   <li>VIDEO → {@code <video src="fileUrl" autoplay loop muted playsinline preload="metadata">}</li>
     * </ul>
     *
     * @param stickerId UUID стикера
     * @return fileUrl + mediaType для рендеринга
     */
    @Transactional(readOnly = true)
    public StickerMessageData getStickerForMessage(UUID stickerId) {
        Sticker sticker = stickerRepository.findById(stickerId)
                .orElseThrow(() -> new IllegalArgumentException("Sticker not found: " + stickerId));
        return new StickerMessageData(sticker.getId(), sticker.getFileUrl(), sticker.getMediaType());
    }

    // ── Вспомогательное ──────────────────────────────────────────────────────

    private StickerType detectType(MultipartFile file) {
        String mime = file.getContentType();
        if (mime == null || !ALLOWED_MIME.contains(mime)) {
            throw new IllegalArgumentException(
                    "Unsupported file type: " + mime + ". Allowed: " + ALLOWED_MIME);
        }
        return mime.startsWith("video/") ? StickerType.VIDEO : StickerType.IMAGE;
    }

    private void validateSlugFormat(String slug) {
        if (slug == null || !slug.matches("^[a-z0-9_-]{3,64}$")) {
            throw new IllegalArgumentException(
                    "Slug must be 3-64 characters: lowercase letters, digits, _ or -");
        }
    }
}
