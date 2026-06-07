package com.studyflow.group;

import com.studyflow.auth.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Invitation a rejoindre un groupe (table group_invitations).
 */
@Entity
@Table(name = "group_invitations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(columnDefinition = "text")
    private String message;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "invitation_status")
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private OffsetDateTime sentAt;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.sentAt = now;
        if (this.expiresAt == null) this.expiresAt = now.plusDays(7);
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.toInstant().isBefore(Instant.now());
    }

    public void accept() {
        this.status = InvitationStatus.ACCEPTED;
        this.respondedAt = OffsetDateTime.now();
    }

    public void decline() {
        this.status = InvitationStatus.DECLINED;
        this.respondedAt = OffsetDateTime.now();
    }
}
