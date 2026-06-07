package com.studyflow.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMembershipRepository extends JpaRepository<GroupMembership, UUID> {

    Optional<GroupMembership> findByGroupIdAndUserId(UUID groupId, UUID userId);

    boolean existsByGroupIdAndUserIdAndActiveTrue(UUID groupId, UUID userId);

    long countByGroupIdAndActiveTrue(UUID groupId);

    List<GroupMembership> findByGroupIdAndActiveTrue(UUID groupId);
}
