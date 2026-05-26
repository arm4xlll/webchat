package com.webchat.controller;

import com.webchat.dto.request.ReadReceiptRequest;
import com.webchat.dto.request.SendMessageRequest;
import com.webchat.dto.request.TypingRequest;
import com.webchat.dto.response.MessageResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.ConversationService;
import com.webchat.service.MessageService;
import com.webchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final MessageService messageService;
    private final PresenceService presenceService;
    private final ConversationService conversationService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request, Principal principal) {
        UserPrincipal user = extractPrincipal(principal);
        log.debug("STOMP message: user={} conv={}", user.getUsername(), request.conversationId());
        messageService.sendMessage(user.getUserId(), request);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        UserPrincipal user = extractPrincipal(principal);
        presenceService.handleTyping(
                request.conversationId(),
                user.getUserId(),
                user.getUsername(),
                request.typing()
        );
    }

    @MessageMapping("/chat.read")
    public void readReceipt(@Payload ReadReceiptRequest request, Principal principal) {
        UserPrincipal user = extractPrincipal(principal);
        conversationService.markAsRead(request.conversationId(), user.getUserId());
    }

    private UserPrincipal extractPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            return (UserPrincipal) auth.getPrincipal();
        }
        throw new SecurityException("Not authenticated");
    }
}
