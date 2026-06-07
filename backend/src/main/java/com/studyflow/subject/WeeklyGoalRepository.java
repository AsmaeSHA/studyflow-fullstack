package com.studyflow.subject;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WeeklyGoalRepository extends JpaRepository<WeeklyGoal, UUID> {

    List<WeeklyGoal> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);

    Optional<WeeklyGoal> findByUserIdAndSubjectIdAndWeekStart(UUID userId, UUID subjectId, LocalDate weekStart);
}
