package com.studyflow.analytics;

import lombok.Builder;

/**
 * Snapshot synthetique du tableau de bord d'un utilisateur.
 * ValueObject, non persiste — calcule a la volee.
 */
@Builder
public record DashboardSummary(
        double  totalStudiedHours,
        double  currentWeekHours,
        int     longestSessionMinutes,
        int     currentStreakDays,
        String  topSubject,
        double  globalCompletionRate,
        int     totalSessions,
        int     completedSessions
) {}
