package com.webchat.controller;

import com.webchat.dto.request.UpdateProfileRequest;
import com.webchat.dto.request.UpdateSettingsRequest;
import com.webchat.dto.response.UserResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.getById(principal.getUserId()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> search(
            @RequestParam String q,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.search(q, principal.getUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getProfile(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.updateProfile(principal.getUserId(), req));
    }

    @PutMapping("/me/settings")
    public ResponseEntity<UserResponse> updateSettings(
            @Valid @RequestBody UpdateSettingsRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.updateSettings(principal.getUserId(), req));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        return ResponseEntity.ok(userService.uploadAvatar(principal.getUserId(), file));
    }
}
