package com.webchat.admin.controller;

import com.webchat.admin.dto.AdminUserDto;
import com.webchat.admin.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping("/admins")
    public List<AdminUserDto> listAdmins() {
        return adminUserService.listAdmins();
    }

    @GetMapping("/search")
    public List<AdminUserDto> search(@RequestParam String q) {
        return adminUserService.searchUsers(q);
    }

    @PostMapping("/{id}/grant")
    public AdminUserDto grant(@PathVariable UUID id) {
        return adminUserService.grantAdmin(id);
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<AdminUserDto> revoke(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(adminUserService.revokeAdmin(id));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
