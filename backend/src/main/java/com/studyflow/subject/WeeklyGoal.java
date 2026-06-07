package com.studyflow.subject;

import com.studyflow.auth.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Objectif hebdomadaire (table `weekly_goals`).
 */
@Entity
@Table(name = "weekly_goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeeklyGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(name = "week_end", nullable = false)
    private LocalDate weekEnd;

    @Column(name = "target_hours", nullable = false)
    @Builder.Default
    private Float targetHours = 0f;

    @Column(name = "achieved_hours", nullable = false)
    @Builder.Default
    private Float achievedHours = 0f;

    @Column(name = "is_achieved", nullable = false)
    @Builder.Default
    private boolean achieved = false;

    public void compute() {
        this.achieved = achievedHours != null
                && targetHours != null
                && achievedHours >= targetHours;
    }
}
