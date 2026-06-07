package com.studyflow.subject;

import com.studyflow.auth.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Matiere definie par un utilisateur (table subjects).
 */
@Entity
@Table(name = "subjects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String color = "#2E86AB";

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 1;

    @Column(name = "weekly_goal_hours", nullable = false)
    @Builder.Default
    private Float weeklyGoalHours = 0f;

    @Column(columnDefinition = "text")
    private String description;

    /** Duree max d'une session pour cette matiere (minutes). Si null, on retombe sur le param global du Scheduler. */
    @Column(name = "max_session_duration")
    private Integer maxSessionDuration;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
