package com.studyflow.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SharedSessionRepository extends JpaRepository<SharedSession, UUID> {

    List<SharedSession> findByGroupIdOrderBySharedAtDesc(UUID groupId);

    List<SharedSession> findBySessionId(UUID sessionId);

    boolean existsByGroupIdAndSessionId(UUID groupId, UUID sessionId);

    Optional<SharedSession> findByGroupIdAndSessionId(UUID groupId, UUID sessionId);
}
