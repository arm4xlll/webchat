package com.webchat.config;

import com.webchat.security.UserPrincipal;
import com.webchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final PresenceService presenceService;

    // SessionConnectEvent (не Connected) — срабатывает при получении CONNECT-фрейма,
    // когда WebSocketAuthInterceptor уже установил principal в headers
    @EventListener
    public void onConnect(SessionConnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        UserPrincipal principal = extractPrincipal(sha);
        if (principal == null) {
            log.warn("[Presence] Could not extract principal on CONNECT");
            return;
        }
        log.info("[Presence] User connected: {} ({})", principal.getUsername(), principal.getUserId());
        presenceService.setOnline(principal.getUserId());
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        UserPrincipal principal = extractPrincipal(sha);
        if (principal == null) return;
        log.info("[Presence] User disconnected: {} ({})", principal.getUsername(), principal.getUserId());
        presenceService.setOffline(principal.getUserId());
    }

    private UserPrincipal extractPrincipal(StompHeaderAccessor sha) {
        java.security.Principal user = sha.getUser();
        if (user instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal;
        }
        return null;
    }
}
