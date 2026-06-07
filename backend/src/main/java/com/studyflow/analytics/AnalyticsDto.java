package com.studyflow.analytics;

import lombok.Builder;

import java.time.LocalDate;
import java.util.Map;

public class AnalyticsDto {

    @Builder
    public record StatResponse(
            String id,
            LocalDate weekStart,
            LocalDate weekEnd,
            int totalPlannedMinutes,
            int totalActualMinutes,
            double completionRate,
            int sessionsCount,
            Map<String, Integer> subjectBreakdown
    ) {
        public static StatResponse from(ProductivityStat s) {
            return StatResponse.builder()
                    .id(s.getId())
                    .weekStart(s.getWeekStart())
                    .weekEnd(s.getWeekEnd())
                    .totalPlannedMinutes(s.getTotalPlannedMinutes())
                    .totalActualMinutes(s.getTotalActualMinutes())
                    .completionRate(s.getCompletionRate())
                    .sessionsCount(s.getSessionsCount())
                    .subjectBreakdown(s.getSubjectBreakdown())
                    .build();
        }
    }
}
