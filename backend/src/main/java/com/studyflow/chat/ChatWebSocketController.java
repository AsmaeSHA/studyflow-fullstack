package com.studyflow.chat;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * Controller STOMP pour le chat temps reel.
 *
 * Le client envoie sur :  /app/chat.send/{roomId}
 * Tous les abonnes recoivent sur : /topic/rooms/{roomId}
 *
 * Authentification :
 *   - Si le client s'est connecte avec un Principal STOMP (en passant le JWT
 *     dans le handshake), on l'utilise.
 *   - Sinon (mode test simple), l'userId peut etre passe via un header STOMP "X-User-Id".
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate broker;

    @MessageMapping("/chat.send/{roomId}")
    public void sendMessage(@DestinationVariable String roomId,
                            @Payload ChatMessageDto.Send payload,
                            SimpMessageHeaderAccessor headers,
                            Principal principal) {
        UUID userId = resolveUserId(principal, headers);
        if (userId == null) {
            log.warn("Message STOMP recu sans utilisateur identifie, ignore.");
            return;
        }
        try {
            ChatMessageDto.Response saved = chatService.send(userId, roomId, payload);
            broker.convertAndSend("/topic/rooms/" + roomId, saved);
        } catch (Exception e) {
            log.warn("Echec WS send (room={}, user={}) : {}", roomId, userId, e.getMessage());
            broker.convertAndSendToUser(userId.toString(), "/queue/errors",
                    "Impossible d'envoyer le message : " + e.getMessage());
        }
    }

    /**
     * Notification de frappe (typing indicator). Pas de persistance.
     * Envoye sur /app/chat.typing/{roomId}, broadcast sur /topic/rooms/{roomId}/typing
     */
    @MessageMapping("/chat.typing/{roomId}")
    public void typing(@DestinationVariable String roomId,
                       SimpMessageHeaderAccessor headers,
                       Principal principal) {
        UUID userId = resolveUserId(principal, headers);
        if (userId == null) return;
        broker.convertAndSend("/topic/rooms/" + roomId + "/typing", userId.toString());
    }

    private UUID resolveUserId(Principal principal, SimpMessageHeaderAccessor headers) {
        if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof User user) {
            return user.getId();
        }
        if (principal != null) {
            return userRepository.findByEmail(principal.getName())
                    .map(User::getId)
                    .orElse(null);
        }
        Object header = headers.getHeader("simpSessionAttributes");
        if (header instanceof java.util.Map<?, ?> attrs) {
            Object uid = attrs.get("userId");
            if (uid != null) {
                try { return UUID.fromString(uid.toString()); } catch (Exception ignored) {}
            }
        }
        return null;
    }
}
