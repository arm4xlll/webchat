package com.webchat.service;

import com.webchat.dto.response.UserResponse;
import com.webchat.model.User;
import com.webchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

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
}
