package com.webchat.admin.service;

import com.webchat.admin.dto.AdminUserDto;
import com.webchat.model.User;
import com.webchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Value("${app.admin.root-username}")
    private String rootUsername;

    public List<AdminUserDto> listAdmins() {
        return userRepository.findAllByIsAdminTrue().stream()
                .map(u -> AdminUserDto.from(u, rootUsername))
                .toList();
    }

    public List<AdminUserDto> searchUsers(String query) {
        return userRepository.findAll().stream()
                .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase())
                          || u.getName().toLowerCase().contains(query.toLowerCase()))
                .limit(20)
                .map(u -> AdminUserDto.from(u, rootUsername))
                .toList();
    }

    @Transactional
    public AdminUserDto grantAdmin(UUID targetId) {
        User user = userRepository.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setAdmin(true);
        userRepository.save(user);
        return AdminUserDto.from(user, rootUsername);
    }

    @Transactional
    public AdminUserDto revokeAdmin(UUID targetId) {
        User user = userRepository.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (rootUsername.equals(user.getUsername())) {
            throw new IllegalStateException("Cannot revoke admin from root user");
        }
        user.setAdmin(false);
        userRepository.save(user);
        return AdminUserDto.from(user, rootUsername);
    }
}
