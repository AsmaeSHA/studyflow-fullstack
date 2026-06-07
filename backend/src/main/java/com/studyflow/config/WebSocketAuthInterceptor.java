package com.studyflow.config;

import com.studyflow.auth.JwtService;
import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Lit le header "Authorization: Bearer <jwt>" du frame STOMP CONNECT
 * et pose un Principal sur la session WebSocket.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("Connexion STOMP anonyme (pas de Bearer token).");
            return message;
        }
        try {
            String jwt = authHeader.substring(7);
            String email = jwtService.extractUsername(jwt);
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                log.warn("Connexion STOMP : utilisateur {} introuvable", email);
                return message;
            }
            // On pose le Principal sur la session, recuperable cote @MessageMapping
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            accessor.setUser(auth);
            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put("userId", user.getId().toString());
            }
            log.info("Connexion STOMP authentifiee : {}", email);
        } catch (Exception e) {
            log.warn("JWT STOMP invalide : {}", e.getMessage());
        }
        return message;
    }
}
