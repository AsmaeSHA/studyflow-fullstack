package com.studyflow.notification;

import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service de gestion des notifications utilisateur (stockees dans Mongo).
 * Methode notifyUser : appelable depuis tout autre service (group, chat, scheduler).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate broker;

    /**
     * Cree et persiste une notification. Asynchrone pour ne pas bloquer le caller.
     */
    @Async
    public void notifyUser(UUID userId, NotificationType type, String message, Map<String, ?> metadata) {
        Map<String, Object> safeMetadata = metadata == null ? new HashMap<>() : new HashMap<>(metadata);
        String dedupeKey = safeMetadata.containsKey("dedupeKey")
                ? String.valueOf(safeMetadata.get("dedupeKey"))
                : type.name() + ":" + safeMetadata;
        safeMetadata.put("dedupeKey", dedupeKey);
        if (notificationRepository.existsByUserIdAndDedupeKey(userId.toString(), dedupeKey)) {
            return;
        }
        Notification n = Notification.builder()
                .userId(userId.toString())
                .type(type)
                .title(titleFor(type))
                .message(message)
                .read(false)
                .createdAt(Instant.now())
                .metadata(safeMetadata)
                .build();
        try {
            Notification saved = notificationRepository.save(n);
            broker.convertAndSend("/topic/users/" + userId + "/notifications", NotificationDto.Response.from(saved));
        } catch (Exception e) {
            log.warn("Echec creation notification (userId={}, type={}): {}", userId, type, e.getMessage());
        }
    }

    private String titleFor(NotificationType type) {
        return switch (type) {
            case GROUP_INVITATION -> "Invitation de groupe";
            case NEW_MESSAGE -> "Nouveau message";
            case SESSION_SHARED -> "Session partagee";
            case GROUP_JOINED -> "Nouveau membre";
            case GOAL_ACHIEVED -> "Objectif atteint";
            case SESSION_REMINDER -> "Rappel de session";
        };
    }

    public List<NotificationDto.Response> list(UUID userId, int page, int size) {
        Page<Notification> result = notificationRepository.findByUserIdOrderByCreatedAtDesc(
                userId.toString(), PageRequest.of(page, Math.min(size, 100)));
        return result.getContent().stream().map(NotificationDto.Response::from).toList();
    }

    public List<NotificationDto.Response> listUnread(UUID userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId.toString())
                .stream().map(NotificationDto.Response::from).toList();
    }

    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId.toString());
    }

    public NotificationDto.Response markAsRead(UUID userId, String notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> ResourceNotFoundException.of("Notification", notificationId));
        if (!n.getUserId().equals(userId.toString())) {
            throw new UnauthorizedException("Cette notification ne vous appartient pas");
        }
        n.markAsRead();
        return NotificationDto.Response.from(notificationRepository.save(n));
    }

    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId.toString());
        unread.forEach(Notification::markAsRead);
        notificationRepository.saveAll(unread);
    }

    public void delete(UUID userId, String notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> ResourceNotFoundException.of("Notification", notificationId));
        if (!n.getUserId().equals(userId.toString())) {
            throw new UnauthorizedException("Cette notification ne vous appartient pas");
        }
        notificationRepository.delete(n);
    }
}
