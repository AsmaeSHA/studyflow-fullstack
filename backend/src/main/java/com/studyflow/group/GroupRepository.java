package com.studyflow.group;

import com.studyflow.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<StudyGroup, UUID> {

    List<StudyGroup> findByOwner(User owner);

    @Query("""
           SELECT DISTINCT g FROM StudyGroup g
           JOIN g.memberships m
           WHERE m.user.id = :userId AND m.active = true
           ORDER BY g.createdAt DESC
           """)
    List<StudyGroup> findGroupsForMember(@Param("userId") UUID userId);

    @Query("""
           SELECT g FROM StudyGroup g
           WHERE g.privateGroup = false
           ORDER BY g.createdAt DESC
           """)
    List<StudyGroup> findPublicGroups();
}
