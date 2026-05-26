package com.webchat.service;

import com.webchat.dto.request.UpdateProfileRequest;
import com.webchat.dto.response.UserResponse;
import com.webchat.model.User;
import com.webchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> search(String query, UUID currentUserId) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        log.debug("User search query='{}' by userId={}", query, currentUserId);
        return userRepository.searchByUsernameOrName(query.trim()).stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public User getEntityById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest req) {
        User user = getEntityById(userId);
        user.setName(req.name());
        user.setBio(req.bio());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse uploadAvatar(UUID userId, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        String extension = getExtension(file.getOriginalFilename(), contentType);
        Path dir = Paths.get(uploadDir, "avatars");
        Files.createDirectories(dir);
        Path dest = dir.resolve(userId + "." + extension);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        User user = getEntityById(userId);
        user.setAvatarUrl("/uploads/avatars/" + userId + "." + extension);
        return UserResponse.from(user);
    }

    private String getExtension(String filename, String contentType) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        }
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> "jpg";
        };
    }
}
