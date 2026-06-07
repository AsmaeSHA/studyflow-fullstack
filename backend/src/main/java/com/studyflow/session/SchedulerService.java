package com.studyflow.session;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.session.dto.GeneratePlanRequest;
import com.studyflow.session.dto.SessionDto;
import com.studyflow.subject.Subject;
import com.studyflow.subject.SubjectRepository;
import com.studyflow.user.AvailabilityRepository;
import com.studyflow.user.model.Availability;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

/**
 * Algorithme de generation automatique d'un plan d'etude hebdomadaire.
 *
 * Etapes :
 *   1) Trier les matieres par priorite (et par minutes restantes a allouer).
 *   2) Lire les disponibilites recurrentes de l'utilisateur.
 *   3) Pour chaque dispo de la semaine cible, decouper en slots evitant les
 *      sessions deja existantes (PLANNED ou IN_PROGRESS).
 *   4) Allouer chaque slot a la matiere ayant le score le plus eleve
 *      (priorite ponderee par minutes restantes a faire).
 *   5) Respecter min/max duration et la pause entre sessions.
 *   6) Persister toutes les nouvelles StudySession en une seule transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final AvailabilityRepository availabilityRepository;
    private final SessionRepository sessionRepository;

    @Transactional
    public List<SessionDto.Response> generatePlan(UUID userId, GeneratePlanRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        LocalDate weekStart = req.weekStart();
        LocalDate weekEnd   = weekStart.plusDays(7);
        OffsetDateTime startUtc = weekStart.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endUtc   = weekEnd.atStartOfDay().atOffset(ZoneOffset.UTC);

        int maxDur = req.maxSessionDurationOrDefault();
        int minDur = req.minSessionDurationOrDefault();
        int gap    = req.breakBetweenMinutesOrDefault();

        // 0) Optionnellement, on supprime les sessions PLANNED de la semaine.
        if (req.replaceExistingOrDefault()) {
            List<StudySession> existing = sessionRepository.findInRange(userId, startUtc, endUtc);
            existing.stream()
                    .filter(s -> s.getStatus() == SessionStatus.PLANNED)
                    .forEach(sessionRepository::delete);
        }

        // 1) Matieres + minutes a allouer
        List<Subject> subjects = subjectRepository.findByUserIdOrderByPriorityDescNameAsc(userId);
        if (subjects.isEmpty()) {
            log.info("Aucune matiere definie pour {} : plan vide.", user.getEmail());
            return List.of();
        }
        Map<UUID, Integer> remaining = new HashMap<>();
        for (Subject s : subjects) {
            int goalMinutes = Math.round((s.getWeeklyGoalHours() == null ? 0f : s.getWeeklyGoalHours()) * 60f);
            remaining.put(s.getId(), goalMinutes);
        }

        // 2) Disponibilites
        List<Availability> dispos = availabilityRepository.findByUserIdOrderByDayOfWeekAscStartTimeAsc(userId);
        if (dispos.isEmpty()) {
            log.info("Aucune disponibilite pour {} : plan vide.", user.getEmail());
            return List.of();
        }

        // 3) Sessions existantes a contourner
        List<StudySession> blockers = sessionRepository.findInRange(userId, startUtc, endUtc).stream()
                .filter(s -> s.getStatus() != SessionStatus.CANCELLED)
                .sorted(Comparator.comparing(StudySession::getStartDateTime))
                .toList();

        // 4) On itere sur chaque jour, chaque dispo, et on alloue.
        List<StudySession> created = new ArrayList<>();
        for (int dayOffset = 0; dayOffset < 7; dayOffset++) {
            LocalDate date = weekStart.plusDays(dayOffset);
            short dow = (short) (date.getDayOfWeek().getValue()); // 1=lundi ... 7=dimanche

            for (Availability dispo : dispos) {
                if (dispo.getDayOfWeek() != dow) continue;
                if (!isAvailabilityValidOn(dispo, date)) continue;

                List<StudySession> daySlots = allocateSlots(date, dispo, blockers, subjects,
                        remaining, maxDur, minDur, gap, user);
                created.addAll(daySlots);
                blockers = mergeAndSort(blockers, daySlots);
            }
        }

        if (created.isEmpty()) {
            log.info("Plan genere vide pour {} sur la semaine du {}.", user.getEmail(), weekStart);
            return List.of();
        }

        sessionRepository.saveAll(created);
        log.info("{} sessions planifiees pour {} (semaine {}).", created.size(), user.getEmail(), weekStart);

        return created.stream().map(SessionDto.Response::from).toList();
    }

    // ---------------------------------------------------------------------
    // Helpers algorithmiques
    // ---------------------------------------------------------------------

    /**
     * Decoupe la fenetre de dispo en slots disponibles (en evitant les blockers),
     * et alloue chaque slot a la matiere meilleur-score restante.
     */
    private List<StudySession> allocateSlots(LocalDate date, Availability dispo,
                                             List<StudySession> blockers,
                                             List<Subject> subjects,
                                             Map<UUID, Integer> remaining,
                                             int maxDur, int minDur, int gap,
                                             User user) {
        List<StudySession> result = new ArrayList<>();

        OffsetDateTime cursor = date.atTime(dispo.getStartTime()).atOffset(ZoneOffset.UTC);
        OffsetDateTime end    = date.atTime(dispo.getEndTime()).atOffset(ZoneOffset.UTC);

        // Ne JAMAIS planifier dans le passe.
        //  - si la fenetre est entierement passee : on ignore
        //  - si elle est en cours : on demarre a "now" arrondi a la 5 min superieure
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!end.isAfter(now)) {
            return result;
        }
        if (cursor.isBefore(now)) {
            cursor = now.withSecond(0).withNano(0);
            int minute = cursor.getMinute();
            int roundUp = (5 - (minute % 5)) % 5;
            if (roundUp > 0) cursor = cursor.plusMinutes(roundUp);
            log.debug("Curseur cale sur now={} pour la dispo du {}", cursor, date);
        }

        while (cursor.plusMinutes(minDur).compareTo(end) <= 0) {
            // Avancer le curseur si chevauchement avec un blocker.
            OffsetDateTime nextBlockerStart = nextBlockerStart(cursor, end, blockers);
            OffsetDateTime windowEnd = nextBlockerStart != null && nextBlockerStart.isBefore(end)
                    ? nextBlockerStart
                    : end;

            long minutesAvailable = Duration.between(cursor, windowEnd).toMinutes();
            if (minutesAvailable < minDur) {
                cursor = skipBlocker(cursor, blockers, gap);
                if (cursor.isAfter(end)) break;
                continue;
            }

            // Choisir la matiere a allouer (meilleur score)
            Subject chosen = pickBestSubject(subjects, remaining);
            if (chosen == null) return result; // plus rien a allouer

            // Duree max : on prend celle DE LA MATIERE en priorite (definie par l'utilisateur),
            // sinon le param global du request en fallback.
            int subjectMaxDur = chosen.getMaxSessionDuration() != null && chosen.getMaxSessionDuration() > 0
                    ? chosen.getMaxSessionDuration()
                    : maxDur;

            int slotDuration = (int) Math.min(
                    Math.min(minutesAvailable, subjectMaxDur),
                    remaining.get(chosen.getId())
            );
            if (slotDuration < minDur) {
                // pas assez pour la meilleure matiere : on s'arrete pour ce dispo
                return result;
            }

            OffsetDateTime sessionStart = cursor;
            OffsetDateTime sessionEnd   = cursor.plusMinutes(slotDuration);

            result.add(StudySession.builder()
                    .user(user)
                    .subject(chosen)
                    .title("Etude " + chosen.getName())
                    .startDateTime(sessionStart)
                    .endDateTime(sessionEnd)
                    .status(SessionStatus.PLANNED)
                    .plannedDuration(slotDuration)
                    .shared(false)
                    .build());

            // Mettre a jour le restant
            remaining.put(chosen.getId(), remaining.get(chosen.getId()) - slotDuration);
            cursor = sessionEnd.plusMinutes(gap);
        }
        return result;
    }

    /**
     * Score = priorite * (minutesRestantes / 60). Permet de favoriser la
     * matiere a la fois prioritaire et avec beaucoup de minutes a faire.
     */
    private Subject pickBestSubject(List<Subject> subjects, Map<UUID, Integer> remaining) {
        Subject best = null;
        double bestScore = 0;
        for (Subject s : subjects) {
            int rem = remaining.getOrDefault(s.getId(), 0);
            if (rem <= 0) continue;
            double score = (s.getPriority() == null ? 1 : s.getPriority()) * (rem / 60.0);
            if (score > bestScore) {
                bestScore = score;
                best = s;
            }
        }
        return best;
    }

    /** Renvoie le debut du prochain blocker dans [from, to], sinon null. */
    private OffsetDateTime nextBlockerStart(OffsetDateTime from, OffsetDateTime to, List<StudySession> blockers) {
        for (StudySession b : blockers) {
            if (b.getEndDateTime().compareTo(from) <= 0) continue; // deja passe
            if (b.getStartDateTime().compareTo(to) >= 0) break;    // hors fenetre
            if (b.getStartDateTime().compareTo(from) <= 0 && b.getEndDateTime().compareTo(from) > 0) {
                // chevauchement direct au curseur : rendre la fin du blocker
                return null;
            }
            return b.getStartDateTime();
        }
        return null;
    }

    /** Si le curseur est dans un blocker, le sauter (avec gap). */
    private OffsetDateTime skipBlocker(OffsetDateTime cursor, List<StudySession> blockers, int gap) {
        for (StudySession b : blockers) {
            if (!b.getStartDateTime().isAfter(cursor) && b.getEndDateTime().isAfter(cursor)) {
                return b.getEndDateTime().plusMinutes(gap);
            }
        }
        return cursor.plusMinutes(15); // garde-fou : on avance d'un quart d'heure si rien ne match
    }

    private boolean isAvailabilityValidOn(Availability a, LocalDate date) {
        if (a.getValidFrom()  != null && date.isBefore(a.getValidFrom()))  return false;
        if (a.getValidUntil() != null && date.isAfter(a.getValidUntil())) return false;
        return true;
    }

    private List<StudySession> mergeAndSort(List<StudySession> a, List<StudySession> b) {
        List<StudySession> merged = new ArrayList<>(a.size() + b.size());
        merged.addAll(a);
        merged.addAll(b);
        merged.sort(Comparator.comparing(StudySession::getStartDateTime));
        return merged;
    }

    // ---------------------------------------------------------------------
    // Methodes utilitaires exposees (cf. diagramme de classes)
    // ---------------------------------------------------------------------


    public boolean checkOverlap(StudySession s1, StudySession s2) {
        return s1.overlaps(s2);
    }

    public List<Subject> prioritize(List<Subject> subjects) {
        return subjects.stream()
                .sorted(Comparator.comparing(
                        (Subject s) -> s.getPriority() == null ? 0 : s.getPriority(),
                        Comparator.reverseOrder())
                        .thenComparing(Subject::getName))
                .toList();
    }

    public boolean validateConstraints(StudySession session, int minDur, int maxDur) {
        int duration = session.getDurationMinutes();
        return duration >= minDur && duration <= maxDur
                && session.getEndDateTime().isAfter(session.getStartDateTime());
    }
}
