package com.webchat.security;

import com.webchat.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final SessionService sessionService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            UUID userId = jwtTokenProvider.extractUserId(token);
            String username = jwtTokenProvider.extractUsername(token);
            UUID sessionId = jwtTokenProvider.extractSessionId(token);
            boolean isAdmin = jwtTokenProvider.extractIsAdmin(token);

            // Check if session was revoked (e.g. kicked from another device)
            if (sessionId != null && sessionService.isRevoked(sessionId)) {
                log.info("Rejected revoked session {} for user {}", sessionId, username);
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Session revoked");
                return;
            }

            UserPrincipal principal = new UserPrincipal(userId, username, sessionId, isAdmin);
            List<SimpleGrantedAuthority> authorities = isAdmin
                    ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    : List.of();
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal, null, authorities
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);

            // Update lastActiveAt at most once per 5 minutes (debounced via Redis)
            if (sessionId != null) {
                sessionService.updateHeartbeat(sessionId);
            }

            log.debug("Authenticated user: {} ({}) session={}", username, userId, sessionId);
        }
        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
