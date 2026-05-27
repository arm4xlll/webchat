package com.webchat.controller;

import com.webchat.dto.request.LoginRequest;
import com.webchat.dto.request.RegisterRequest;
import com.webchat.dto.response.AuthResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        log.info("Registration request for username: {}", request.username());
        return ResponseEntity.ok(authService.register(
                request, getUserAgent(httpRequest), getClientIp(httpRequest)));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        log.info("Login request for username: {}", request.username());
        return ResponseEntity.ok(authService.login(
                request, getUserAgent(httpRequest), getClientIp(httpRequest)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal.getUserId(), principal.getSessionId());
        return ResponseEntity.ok().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].strip();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.strip();
        }
        return request.getRemoteAddr();
    }

    private String getUserAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
