package com.studyflow.group;

import com.studyflow.auth.model.User;
import com.studyflow.session.StudySession;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Partage d'une session d'etude avec un groupe (table shared_sessions).
 */
@Entity
@Table(name = "shared_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private StudySession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup group;

    /** Utilisateur qui a partage la session (colonne shared_by cote Supabase). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_by")
    private User sharedBy;

    @Column(name = "shared_at", nullable = false, updatable = false)
    private OffsetDateTime sharedAt;

    @Column(columnDefinition = "text")
    private String message;

    @PrePersist
    void onCreate() {
        this.sharedAt = OffsetDateTime.now();
    }
}
