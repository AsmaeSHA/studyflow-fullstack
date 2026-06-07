package com.studyflow.notification;

import com.studyflow.session.SessionRepository;
import com.studyflow.session.SessionStatus;
import com.studyflow.session.StudySession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.List;
import java.util.Map;

/**
 * Jobs planifies pour les notifications :
 *   - Rappels 30, 15 et 5 min avant une session PLANNED
 *   - Rappel quotidien des objectifs hebdomadaires (08h00)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final SessionRepository sessionRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    /** Chaque minute : rappels 30, 15 et 5 minutes avant une session PLANNED. */
    @Scheduled(cron = "0 * * * * *")
    public void sendSessionReminders() {
        log.info("Reminder scheduler running");
        OffsetDateTime now = OffsetDateTime.now();
        Set<Integer> reminderMinutes = Set.of(30, 15, 5);

        try {
            List<StudySession> sessions = sessionRepository.findAll().stream()
                    .filter(s -> s.getStatus() == SessionStatus.PLANNED)
                    .filter(s -> s.getStartDateTime().isAfter(now))
                    .filter(s -> {
                        long secondsUntilStart = java.time.Duration.between(now, s.getStartDateTime()).getSeconds();
                        return reminderMinutes.stream()
                                .anyMatch(minutes -> secondsUntilStart > (minutes - 1) * 60L
                                        && secondsUntilStart <= minutes * 60L);
                    })
                    .toList();

            for (StudySession s : sessions) {
                long secondsUntilStart = java.time.Duration.between(now, s.getStartDateTime()).getSeconds();
                int minutes = reminderMinutes.stream()
                        .filter(value -> secondsUntilStart > (value - 1) * 60L && secondsUntilStart <= value * 60L)
                        .findFirst()
                        .orElse(0);
                if (minutes == 0) continue;

                String reminderType = "SESSION_REMINDER_" + minutes;
                String dedupeKey = s.getUser().getId() + ":" + s.getId() + ":" + reminderType;
                if (notificationRepository.existsByUserIdAndDedupeKey(s.getUser().getId().toString(), dedupeKey)) {
                    log.info("Reminder skipped because already exists for session {} ({})", s.getId(), reminderType);
                    continue;
                }

                notificationService.notifyUser(
                        s.getUser().getId(),
                        NotificationType.SESSION_REMINDER,
                        "Votre session '" + s.getTitle() + "' commence dans " + minutes + " minutes.",
                        Map.of(
                                "sessionId", s.getId().toString(),
                                "sessionTitle", s.getTitle(),
                                "reminderType", reminderType,
                                "type", "SESSION_REMINDER",
                                "dedupeKey", dedupeKey
                        )
                );
                log.info("Reminder created for session {} ({})", s.getId(), reminderType);
            }
            if (!sessions.isEmpty()) {
                log.info("{} rappels de session envoyes.", sessions.size());
            }
        } catch (Exception e) {
            log.warn("Erreur lors de l'envoi des rappels de session : {}", e.getMessage());
        }
    }
}
