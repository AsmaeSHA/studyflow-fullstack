package com.studyflow.analytics;

import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.notification.NotificationService;
import com.studyflow.notification.NotificationType;
import com.studyflow.session.SessionRepository;
import com.studyflow.session.SessionStatus;
import com.studyflow.session.StudySession;
import com.studyflow.subject.Subject;
import com.studyflow.subject.SubjectRepository;
import com.studyflow.subject.WeeklyGoal;
import com.studyflow.subject.WeeklyGoalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Calcule et persiste les statistiques hebdomadaires d'un utilisateur.
 * Fournit egalement un DashboardSummary calcule a la volee.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final SessionRepository sessionRepository;
    private final SubjectRepository subjectRepository;
    private final WeeklyGoalRepository weeklyGoalRepository;
    private final ProductivityStatRepository statsRepository;
    private final NotificationService notificationService;

    // ----------------- Calcul hebdomadaire -----------------

    @Transactional
    public ProductivityStat computeWeeklyStats(UUID userId, LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        // Postgres queries veulent un OffsetDateTime
        OffsetDateTime start = weekStart.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end   = weekEnd.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<StudySession> sessions = sessionRepository.findInRange(userId, start, end);

        int totalPlanned = 0;
        int totalActual  = 0;
        int completedCount = 0;
        Map<String, Integer> breakdown = new HashMap<>();

        for (StudySession s : sessions) {
            int planned = s.getPlannedDuration() != null ? s.getPlannedDuration() : s.getDurationMinutes();
            totalPlanned += planned;
            if (s.getStatus() == SessionStatus.COMPLETED) {
                int actual = s.getActualDuration() != null ? s.getActualDuration() : planned;
                totalActual += actual;
                completedCount++;
                String subjectId = s.getSubject() != null ? s.getSubject().getId().toString() : "none";
                breakdown.merge(subjectId, actual, Integer::sum);
            }
        }

        double rate = totalPlanned > 0 ? Math.min(1.0, (double) totalActual / totalPlanned) : 0.0;

        ProductivityStat stat = statsRepository.findByUserIdAndWeekStart(userId.toString(), weekStart)
                .orElseGet(ProductivityStat::new);
        stat.setUserId(userId.toString());
        stat.setWeekStart(weekStart);
        stat.setWeekEnd(weekEnd);
        stat.setTotalPlannedMinutes(totalPlanned);
        stat.setTotalActualMinutes(totalActual);
        stat.setCompletionRate(rate);
        stat.setSessionsCount(completedCount);
        stat.setSubjectBreakdown(breakdown);
        stat.setCreatedAt(Instant.now());
        statsRepository.save(stat);

        // Mettre a jour les WeeklyGoal & notifier si objectif atteint
        updateWeeklyGoals(userId, weekStart, breakdown);

        return stat;
    }

    private void updateWeeklyGoals(UUID userId, LocalDate weekStart, Map<String, Integer> breakdown) {
        List<WeeklyGoal> goals = weeklyGoalRepository.findByUserIdAndWeekStart(userId, weekStart);
        for (WeeklyGoal g : goals) {
            if (g.getSubject() == null) continue;
            int minutes = breakdown.getOrDefault(g.getSubject().getId().toString(), 0);
            float achievedHours = minutes / 60f;
            boolean wasAchieved = g.isAchieved();
            g.setAchievedHours(achievedHours);
            g.compute();
            weeklyGoalRepository.save(g);
            if (!wasAchieved && g.isAchieved()) {
                notificationService.notifyUser(
                        userId,
                        NotificationType.GOAL_ACHIEVED,
                        "Bravo ! Objectif hebdomadaire atteint pour " + g.getSubject().getName(),
                        Map.of("subjectId", g.getSubject().getId().toString(), "weekStart", weekStart.toString())
                );
            }
        }
    }

    // ----------------- Lecture -----------------

    public List<AnalyticsDto.StatResponse> listMyStats(UUID userId) {
        return statsRepository.findByUserIdOrderByWeekStartDesc(userId.toString())
                .stream().map(AnalyticsDto.StatResponse::from).toList();
    }

    public AnalyticsDto.StatResponse getWeek(UUID userId, LocalDate weekStart) {
        ProductivityStat s = statsRepository.findByUserIdAndWeekStart(userId.toString(), weekStart)
                .orElseGet(() -> computeWeeklyStats(userId, weekStart));
        return AnalyticsDto.StatResponse.from(s);
    }

    // ----------------- Dashboard -----------------

    @Transactional(readOnly = true)
    public DashboardSummary generateDashboard(UUID userId) {
        // Toutes les sessions completes de l'utilisateur (limite : utilisable jusqu'a qq milliers).
        List<StudySession> all = sessionRepository.findByUserIdOrderByStartDateTimeDesc(userId);
        List<StudySession> completed = all.stream().filter(s -> s.getStatus() == SessionStatus.COMPLETED).toList();

        int totalMinutes = completed.stream()
                .mapToInt(s -> s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes())
                .sum();

        LocalDate currentWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        OffsetDateTime currentWeekStartUtc = currentWeekStart.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime currentWeekEndUtc   = currentWeekStart.plusDays(7).atStartOfDay().atOffset(ZoneOffset.UTC);
        int currentWeekMinutes = sessionRepository.findInRange(userId, currentWeekStartUtc, currentWeekEndUtc).stream()
                .filter(s -> s.getStatus() == SessionStatus.COMPLETED)
                .mapToInt(s -> s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes())
                .sum();

        int longestMinutes = completed.stream()
                .mapToInt(s -> s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes())
                .max().orElse(0);

        // Streak = nombre de jours consecutifs (en remontant) avec au moins 1 session COMPLETED
        int streak = computeStreak(completed);

        // Top subject
        String topSubject = computeTopSubject(completed);

        // Taux de completion global
        int plannedTotal = all.stream()
                .mapToInt(s -> s.getPlannedDuration() != null ? s.getPlannedDuration() : s.getDurationMinutes())
                .sum();
        double rate = plannedTotal > 0 ? Math.min(1.0, (double) totalMinutes / plannedTotal) : 0.0;

        return DashboardSummary.builder()
                .totalStudiedHours(round1(totalMinutes / 60.0))
                .currentWeekHours(round1(currentWeekMinutes / 60.0))
                .longestSessionMinutes(longestMinutes)
                .currentStreakDays(streak)
                .topSubject(topSubject)
                .globalCompletionRate(round1(rate * 100) / 100.0)
                .totalSessions(all.size())
                .completedSessions(completed.size())
                .build();
    }

    private int computeStreak(List<StudySession> completed) {
        if (completed.isEmpty()) return 0;
        LocalDate today = LocalDate.now();
        LocalDate cursor = today;
        int streak = 0;
        while (true) {
            LocalDate checkDate = cursor;
            boolean dayHasSession = completed.stream()
                    .anyMatch(s -> s.getStartDateTime().toLocalDate().equals(checkDate));
            if (dayHasSession) {
                streak++;
                cursor = cursor.minusDays(1);
            } else if (cursor.equals(today)) {
                cursor = cursor.minusDays(1); // tolerance pour aujourd'hui
            } else {
                break;
            }
            if (streak > 365) break; // garde-fou
        }
        return streak;
    }

    private String computeTopSubject(List<StudySession> completed) {
        Map<UUID, Integer> totals = new HashMap<>();
        for (StudySession s : completed) {
            if (s.getSubject() == null) continue;
            int minutes = s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes();
            totals.merge(s.getSubject().getId(), minutes, Integer::sum);
        }
        if (totals.isEmpty()) return null;
        UUID topId = totals.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
        if (topId == null) return null;
        return subjectRepository.findById(topId).map(Subject::getName).orElse(null);
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
