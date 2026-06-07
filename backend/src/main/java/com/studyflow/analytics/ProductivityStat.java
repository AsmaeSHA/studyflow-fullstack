package com.studyflow.analytics;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Statistiques de productivite hebdomadaires (collection productivity_stats).
 * subjectBreakdown : map subjectId -> minutes etudiees.
 */
@Document(collection = "productivity_stats")
@CompoundIndex(name = "idx_user_week", def = "{'userId': 1, 'weekStart': -1}", unique = true)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductivityStat {

    @Id
    private String id;

    private String userId;

    private LocalDate weekStart;

    private LocalDate weekEnd;

    @Builder.Default
    private int totalPlannedMinutes = 0;

    @Builder.Default
    private int totalActualMinutes = 0;

    @Builder.Default
    private double completionRate = 0.0;

    @Builder.Default
    private int sessionsCount = 0;

    @Builder.Default
    private Map<String, Integer> subjectBreakdown = new HashMap<>();

    private Instant createdAt;

    public double computeCompletionRate() {
        if (totalPlannedMinutes <= 0) return 0.0;
        return Math.min(1.0, (double) totalActualMinutes / totalPlannedMinutes);
    }
}
