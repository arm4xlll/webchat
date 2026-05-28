package com.webchat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webchat.dto.response.LinkPreviewResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LinkPreviewService {

    private static final int MAX_KEY_LENGTH = 512;
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public Optional<LinkPreviewResponse> getPreview(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }

        String cacheKey = "meta:" + (url.length() > MAX_KEY_LENGTH ? url.substring(0, MAX_KEY_LENGTH) : url);

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return Optional.of(objectMapper.readValue(cached, LinkPreviewResponse.class));
            }
        } catch (Exception e) {
            log.warn("Failed to read link preview from cache for url={}: {}", url, e.getMessage());
        }

        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0")
                    .timeout(5000)
                    .maxBodySize(512 * 1024) // 512 KB — enough for <head> metadata
                    .get();

            String title = metaContent(doc, "og:title");
            if (title == null || title.isBlank()) {
                title = doc.title();
            }

            String description = metaContent(doc, "og:description");
            if (description == null || description.isBlank()) {
                description = metaContent(doc, "description");
            }

            String imageUrl = metaContent(doc, "og:image");
            String siteName = metaContent(doc, "og:site_name");

            LinkPreviewResponse response = new LinkPreviewResponse(url, title, description, imageUrl, siteName);

            try {
                String json = objectMapper.writeValueAsString(response);
                redisTemplate.opsForValue().set(cacheKey, json, TTL);
            } catch (Exception e) {
                log.warn("Failed to cache link preview for url={}: {}", url, e.getMessage());
            }

            return Optional.of(response);
        } catch (Exception e) {
            log.warn("Failed to fetch link preview for url={}: {}", url, e.getMessage());
            return Optional.empty();
        }
    }

    private String metaContent(Document doc, String property) {
        // Try og: / twitter: style property attribute first
        var el = doc.selectFirst("meta[property=" + property + "]");
        if (el != null) {
            return el.attr("content");
        }
        // Fallback: name attribute (for description etc.)
        el = doc.selectFirst("meta[name=" + property + "]");
        if (el != null) {
            return el.attr("content");
        }
        return null;
    }
}
