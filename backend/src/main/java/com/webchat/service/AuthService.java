package com.webchat.service;

import com.webchat.dto.request.LoginRequest;
import com.webchat.dto.request.RegisterRequest;
import com.webchat.dto.response.AuthResponse;
import com.webchat.model.Session;
import com.webchat.model.User;
import com.webchat.repository.RefreshTokenRepository;
import com.webchat.repository.UserRepository;
import com.webchat.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final SessionService sessionService;

    @Value("${app.admin.root-username}")
    private String rootUsername;

    @Transactional
    public AuthResponse register(RegisterRequest req, String userAgent, String ipAddress) {
        if (userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username already taken: " + req.username());
        }
        User user = User.builder()
                .name(req.name())
                .username(req.username())
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        userRepository.save(user);
        log.info("Registered new user: {} ({})", user.getUsername(), user.getId());

        boolean effectiveAdmin = user.isAdmin() || rootUsername.equals(user.getUsername());
        Session session = sessionService.createSession(user, userAgent, ipAddress);
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getUsername(), session.getId(), effectiveAdmin);
        return new AuthResponse(user.getId(), user.getUsername(), user.getName(),
                user.getBio(), user.getAvatarUrl(), accessToken, effectiveAdmin);
    }

    @Transactional
    public AuthResponse login(LoginRequest req, String userAgent, String ipAddress) {
        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            log.warn("Failed login attempt for username: {}", req.username());
            throw new IllegalArgumentException("Invalid credentials");
        }

        log.info("User logged in: {} ({})", user.getUsername(), user.getId());
        boolean effectiveAdmin = user.isAdmin() || rootUsername.equals(user.getUsername());
        Session session = sessionService.createSession(user, userAgent, ipAddress);
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getUsername(), session.getId(), effectiveAdmin);
        return new AuthResponse(user.getId(), user.getUsername(), user.getName(),
                user.getBio(), user.getAvatarUrl(), accessToken, effectiveAdmin);
    }

    @Transactional
    public void logout(UUID userId, UUID sessionId) {
        sessionService.logoutSession(sessionId);
        refreshTokenRepository.deleteByUserId(userId);
        log.info("User logged out: {} session={}", userId, sessionId);
    }
}
