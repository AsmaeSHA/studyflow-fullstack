package com.studyflow.analytics;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Job hebdomadaire : tous les lundis a 03h00, recalcule les stats de la semaine
 * precedente pour chaque utilisateur et notifie si goals atteints.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WeeklyStatsJob {

    private final UserRepository userRepository;
    private final AnalyticsService analyticsService;

    @Scheduled(cron = "0 0 3 * * MON")
    public void computeLastWeekStats() {
        LocalDate lastMonday = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(1);
        log.info("Demarrage du calcul des stats de la semaine du {}", lastMonday);

        int processed = 0;
        for (User u : userRepository.findAll()) {
            try {
                analyticsService.computeWeeklyStats(u.getId(), lastMonday);
                processed++;
            } catch (Exception e) {
                log.warn("Echec stats user {} : {}", u.getEmail(), e.getMessage());
            }
        }
        log.info("Calcul termine pour {} utilisateurs.", processed);
    }
}
