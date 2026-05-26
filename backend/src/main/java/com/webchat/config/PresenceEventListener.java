package com.webchat.config;

import com.webchat.security.UserPrincipal;
import com.webchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final PresenceService presenceService;

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        UserPrincipal principal = extractPrincipal(event.getUser());
        if (principal == null) return;
        presenceService.setOnline(principal.getUserId());
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        UserPrincipal principal = extractPrincipal(event.getUser());
        if (principal == null) return;
        presenceService.setOffline(principal.getUserId());
    }

    private UserPrincipal extractPrincipal(java.security.Principal user) {
        if (user instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal;
        }
        return null;
    }
}
