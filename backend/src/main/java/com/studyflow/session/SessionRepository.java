package com.studyflow.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<StudySession, UUID> {

    /** Sessions de l'utilisateur sur une periode (utilise pour calendrier + scheduler). */
    @Query("""
           SELECT s FROM StudySession s
           WHERE s.user.id = :userId
             AND s.startDateTime < :end
             AND s.endDateTime   > :start
           ORDER BY s.startDateTime ASC
           """)
    List<StudySession> findInRange(@Param("userId") UUID userId,
                                   @Param("start")  OffsetDateTime start,
                                   @Param("end")    OffsetDateTime end);

    List<StudySession> findByUserIdAndStatusOrderByStartDateTimeAsc(UUID userId, SessionStatus status);

    List<StudySession> findByUserIdOrderByStartDateTimeDesc(UUID userId);

    boolean existsByUserIdAndStatusAndIdNot(UUID userId, SessionStatus status, UUID id);

    @Query("""
           SELECT s FROM StudySession s
           JOIN FETCH s.user u
           LEFT JOIN FETCH s.subject sub
           WHERE s.user.id IN :userIds
             AND (:memberId IS NULL OR s.user.id = :memberId)
             AND (:subjectId IS NULL OR s.subject.id = :subjectId)
             AND (:start IS NULL OR s.startDateTime >= :start)
             AND (:end IS NULL OR s.startDateTime <= :end)
           ORDER BY s.startDateTime ASC
           """)
    List<StudySession> findGroupSessions(@Param("userIds") List<UUID> userIds,
                                         @Param("memberId") UUID memberId,
                                         @Param("subjectId") UUID subjectId,
                                         @Param("start") OffsetDateTime start,
                                         @Param("end") OffsetDateTime end);

    /** Comptage des sessions par matiere et statut sur une fenetre — utilise par les stats. */
    @Query("""
           SELECT s.subject.id, COUNT(s)
           FROM StudySession s
           WHERE s.user.id = :userId
             AND s.startDateTime BETWEEN :start AND :end
             AND s.status = :status
           GROUP BY s.subject.id
           """)
    List<Object[]> countByUserSubjectStatus(@Param("userId") UUID userId,
                                            @Param("start") OffsetDateTime start,
                                            @Param("end")   OffsetDateTime end,
                                            @Param("status") SessionStatus status);
}
