package com.studyflow.session;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.exception.UnauthorizedException;
import com.studyflow.session.dto.SessionDto;
import com.studyflow.subject.Subject;
import com.studyflow.subject.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CRUD + actions metier sur les sessions d'etude.
 * Verifie systematiquement l'ownership.
 */
@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final Map<UUID, OffsetDateTime> actualStartedAtBySession = new ConcurrentHashMap<>();

    // -------------------- LECTURE --------------------

    @Transactional
    public List<SessionDto.Response> listForUser(UUID userId) {
        autoCompleteExpiredInProgress(userId);
        return sessionRepository.findByUserIdOrderByStartDateTimeDesc(userId)
                .stream().map(SessionDto.Response::from).toList();
    }

    @Transactional
    public List<SessionDto.Response> listInRange(UUID userId, OffsetDateTime start, OffsetDateTime end) {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("La date de fin doit etre apres la date de debut");
        }
        autoCompleteExpiredInProgress(userId);
        return sessionRepository.findInRange(userId, start, end)
                .stream().map(SessionDto.Response::from).toList();
    }

    @Transactional
    public SessionDto.Response getOne(UUID userId, UUID sessionId) {
        autoCompleteExpiredInProgress(userId);
        StudySession s = loadOwned(userId, sessionId);
        return SessionDto.Response.from(s);
    }

    // -------------------- ECRITURE --------------------

    @Transactional
    public SessionDto.Response create(UUID userId, SessionDto.CreateOrUpdate body) {
        validateRange(body.startDateTime(), body.endDateTime());
        validateFutureStart(body.startDateTime());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        Subject subject = resolveSubject(userId, body.subjectId());

        ensureNoOverlap(userId, body.startDateTime(), body.endDateTime(), null);

        StudySession s = StudySession.builder()
                .user(user)
                .subject(subject)
                .title(body.title())
                .startDateTime(body.startDateTime())
                .endDateTime(body.endDateTime())
                .status(SessionStatus.PLANNED)
                .shared(false)
                .notes(body.notes())
                .build();

        return SessionDto.Response.from(sessionRepository.save(s));
    }

    @Transactional
    public SessionDto.Response update(UUID userId, UUID sessionId, SessionDto.CreateOrUpdate body) {
        validateRange(body.startDateTime(), body.endDateTime());
        validateFutureStart(body.startDateTime());

        StudySession s = loadOwned(userId, sessionId);
        if (s.getStatus() == SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Une session en cours ne peut plus etre replanifiee");
        }
        if (s.getStatus() == SessionStatus.COMPLETED) {
            throw new IllegalStateException("Une session deja COMPLETED ne peut plus etre modifiee");
        }
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new IllegalStateException("Une session annulee ne peut plus etre modifiee");
        }

        ensureNoOverlap(userId, body.startDateTime(), body.endDateTime(), s.getId());

        s.setTitle(body.title());
        s.setStartDateTime(body.startDateTime());
        s.setEndDateTime(body.endDateTime());
        s.setNotes(body.notes());
        s.setSubject(resolveSubject(userId, body.subjectId()));
        s.setPlannedDuration((int) Duration.between(body.startDateTime(), body.endDateTime()).toMinutes());

        return SessionDto.Response.from(sessionRepository.save(s));
    }

    @Transactional
    public void delete(UUID userId, UUID sessionId) {
        StudySession s = loadOwned(userId, sessionId);
        sessionRepository.delete(s);
    }

    // -------------------- ACTIONS METIER --------------------

    @Transactional
    public SessionDto.Response start(UUID userId, UUID sessionId) {
        autoCompleteExpiredInProgress(userId);
        OffsetDateTime now = nowUtc();
        StudySession s = loadOwned(userId, sessionId);

        if (s.getStatus() != SessionStatus.PLANNED) {
            throw new IllegalStateException("Seule une session planifiee peut etre demarree");
        }
        if (now.isBefore(s.getStartDateTime())) {
            throw new IllegalStateException("Cette session n'a pas encore commencé.");
        }
        if (!s.getEndDateTime().isAfter(now)) {
            throw new IllegalStateException("Cette session est expirée.");
        }
        if (sessionRepository.existsByUserIdAndStatusAndIdNot(userId, SessionStatus.IN_PROGRESS, s.getId())) {
            throw new IllegalStateException("Vous avez deja une session en cours");
        }

        actualStartedAtBySession.put(s.getId(), now);
        s.setStatus(SessionStatus.IN_PROGRESS);
        return SessionDto.Response.from(sessionRepository.save(s));
    }

    @Transactional
    public SessionDto.Response markAsCompleted(UUID userId, UUID sessionId, SessionDto.Complete body) {
        autoCompleteExpiredInProgress(userId);
        StudySession s = loadOwned(userId, sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new IllegalStateException("Impossible de cloturer une session annulee");
        }
        if (s.getStatus() == SessionStatus.COMPLETED) {
            return SessionDto.Response.from(s);
        }
        if (s.getStatus() == SessionStatus.PLANNED && s.getEndDateTime().isAfter(nowUtc())) {
            throw new IllegalStateException("Impossible de terminer une session planifiee avant son heure de fin");
        }

        if (body != null && body.notes() != null) {
            s.setNotes(body.notes());
        }
        if (body != null && body.actualDuration() != null && s.getStatus() != SessionStatus.IN_PROGRESS) {
            s.setActualDuration(body.actualDuration());
        }
        if (s.getActualDuration() == null) {
            setActualDurationUntil(s, nowUtc());
        }
        s.markAsCompleted();
        actualStartedAtBySession.remove(s.getId());
        return SessionDto.Response.from(sessionRepository.save(s));
    }

    @Transactional
    public SessionDto.Response reschedule(UUID userId, UUID sessionId, OffsetDateTime newStart) {
        autoCompleteExpiredInProgress(userId);
        StudySession s = loadOwned(userId, sessionId);
        if (s.getStatus() == SessionStatus.COMPLETED) {
            throw new IllegalStateException("Une session COMPLETED ne peut etre replanifiee");
        }

        OffsetDateTime newEnd = newStart.plusMinutes(s.getDurationMinutes());
        ensureNoOverlap(userId, newStart, newEnd, s.getId());
        s.reschedule(newStart);
        return SessionDto.Response.from(sessionRepository.save(s));
    }

    @Transactional
    public SessionDto.Response cancel(UUID userId, UUID sessionId) {
        autoCompleteExpiredInProgress(userId);
        StudySession s = loadOwned(userId, sessionId);
        if (s.getStatus() != SessionStatus.PLANNED && s.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Seule une session planifiee ou en cours peut etre annulee");
        }
        s.cancel();
        actualStartedAtBySession.remove(s.getId());
        return SessionDto.Response.from(sessionRepository.save(s));
    }

    // -------------------- HELPERS --------------------

    private void autoCompleteExpiredInProgress(UUID userId) {
        OffsetDateTime now = nowUtc();
        sessionRepository.findByUserIdAndStatusOrderByStartDateTimeAsc(userId, SessionStatus.IN_PROGRESS)
                .stream()
                .filter(s -> !s.getEndDateTime().isAfter(now))
                .forEach(s -> {
                    setActualDurationUntil(s, s.getEndDateTime());
                    s.markAsCompleted();
                    actualStartedAtBySession.remove(s.getId());
                    sessionRepository.save(s);
                });
    }

    private void setActualDurationUntil(StudySession s, OffsetDateTime endBoundary) {
        OffsetDateTime actualStartedAt = actualStartedAtBySession.getOrDefault(s.getId(), s.getStartDateTime());
        OffsetDateTime actualEndedAt = endBoundary.isAfter(s.getEndDateTime()) ? s.getEndDateTime() : endBoundary;
        long minutes = Duration.between(actualStartedAt, actualEndedAt).toMinutes();
        s.setActualDuration((int) Math.max(0, minutes));
    }

    private OffsetDateTime nowUtc() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private StudySession loadOwned(UUID userId, UUID sessionId) {
        StudySession s = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of("StudySession", sessionId));
        if (!s.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Cette session ne vous appartient pas");
        }
        return s;
    }

    private Subject resolveSubject(UUID userId, UUID subjectId) {
        if (subjectId == null) return null;
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ResourceNotFoundException.of("Subject", subjectId));
        if (!subject.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Cette matiere ne vous appartient pas");
        }
        return subject;
    }

    private void validateRange(OffsetDateTime start, OffsetDateTime end) {
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("L'heure de fin doit etre strictement apres celle de debut");
        }
    }

    private void validateFutureStart(OffsetDateTime start) {
        if (!start.isAfter(nowUtc())) {
            throw new IllegalArgumentException("Impossible de planifier une session dans le passe.");
        }
    }

    private void ensureNoOverlap(UUID userId, OffsetDateTime start, OffsetDateTime end, UUID excludeId) {
        List<StudySession> conflicts = sessionRepository.findInRange(userId, start, end);
        for (StudySession existing : conflicts) {
            if (excludeId != null && existing.getId().equals(excludeId)) continue;
            if (existing.getStatus() == SessionStatus.CANCELLED) continue;
            throw new IllegalStateException("Vous avez deja une session planifiee sur ce creneau.");
        }
    }
}
