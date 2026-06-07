package com.studyflow.group;

import com.studyflow.auth.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Groupe d'etude (table study_groups).
 * Le lien vers la salle de chat MongoDB se fait via ChatRoom.groupId
 * (la ChatRoom Mongo est retrouvee par ChatRoomRepository.findByGroupId).
 */
@Entity
@Table(name = "study_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    /** Createur du groupe. La base Supabase existante utilise created_by. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "is_private", nullable = false)
    @Builder.Default
    private boolean privateGroup = false;

    @Column(name = "max_members", nullable = false)
    @Builder.Default
    private Integer maxMembers = 20;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<GroupMembership> memberships = new HashSet<>();

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public int getMemberCount() {
        return memberships == null ? 0 : (int) memberships.stream().filter(GroupMembership::isActive).count();
    }
}
