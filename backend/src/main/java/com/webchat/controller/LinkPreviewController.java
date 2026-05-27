package com.webchat.controller;

import com.webchat.dto.response.LinkPreviewResponse;
import com.webchat.service.LinkPreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meta")
@RequiredArgsConstructor
public class LinkPreviewController {

    private final LinkPreviewService linkPreviewService;

    @GetMapping
    public ResponseEntity<LinkPreviewResponse> preview(@RequestParam String url) {
        return linkPreviewService.getPreview(url)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
