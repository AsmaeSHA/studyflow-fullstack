package com.studyflow.session;

import com.studyflow.auth.model.User;
import com.studyflow.subject.Subject;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Session d'etude planifiee ou realisee (table study_sessions).
 */
@Entity
@Table(name = "study_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySession {

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

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "start_date_time", nullable = false)
    private OffsetDateTime startDateTime;

    @Column(name = "end_date_time", nullable = false)
    private OffsetDateTime endDateTime;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "session_status")
    @Builder.Default
    private SessionStatus status = SessionStatus.PLANNED;

    @Column(name = "is_shared", nullable = false)
    @Builder.Default
    private boolean shared = false;

    /** Duree planifiee en minutes (snapshot a la creation). */
    @Column(name = "planned_duration")
    private Integer plannedDuration;

    /** Duree reellement effectuee en minutes (renseignee a la cloture). */
    @Column(name = "actual_duration")
    private Integer actualDuration;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        if (this.plannedDuration == null && startDateTime != null && endDateTime != null) {
            this.plannedDuration = (int) Duration.between(startDateTime, endDateTime).toMinutes();
        }
    }

    // ----- methodes metier -----

    /** Cloture la session : status COMPLETED + remplit actualDuration. */
    public void markAsCompleted() {
        this.status = SessionStatus.COMPLETED;
        if (actualDuration == null) {
            this.actualDuration = (int) Duration.between(startDateTime, endDateTime).toMinutes();
        }
    }

    /** Replanifie la session en conservant la duree planifiee initiale. */
    public void reschedule(OffsetDateTime newStart) {
        long minutes = plannedDuration != null
                ? plannedDuration
                : Duration.between(startDateTime, endDateTime).toMinutes();
        this.startDateTime = newStart;
        this.endDateTime = newStart.plusMinutes(minutes);
        this.status = SessionStatus.PLANNED;
    }

    public void cancel() {
        this.status = SessionStatus.CANCELLED;
    }

    /** Duree planifiee (en minutes), recalculee si non stockee. */
    public int getDurationMinutes() {
        if (plannedDuration != null) return plannedDuration;
        if (startDateTime != null && endDateTime != null) {
            return (int) Duration.between(startDateTime, endDateTime).toMinutes();
        }
        return 0;
    }

    /** Vrai si l'intervalle [startDateTime, endDateTime] chevauche celui d'une autre. */
    public boolean overlaps(StudySession other) {
        return this.startDateTime.isBefore(other.endDateTime)
            && other.startDateTime.isBefore(this.endDateTime);
    }
}
