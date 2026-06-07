package com.studyflow.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, UUID> {

    List<GroupInvitation> findByRecipientIdAndStatusOrderBySentAtDesc(UUID recipientId, InvitationStatus status);

    List<GroupInvitation> findByGroupIdOrderBySentAtDesc(UUID groupId);

    boolean existsByGroupIdAndRecipientIdAndStatus(UUID groupId, UUID recipientId, InvitationStatus status);
}
