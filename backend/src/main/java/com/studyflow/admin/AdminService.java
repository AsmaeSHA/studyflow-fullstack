package com.studyflow.admin;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.Role;
import com.studyflow.auth.model.User;
import com.studyflow.chat.ChatMessageRepository;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.group.GroupRepository;
import com.studyflow.session.SessionRepository;
import com.studyflow.session.SessionStatus;
import com.studyflow.session.StudySession;
import com.studyflow.subject.SubjectRepository;
import com.studyflow.user.dto.UserProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.WeekFields;
import java.util.*;

/**
 * Operations administratives — toutes requierent le role ADMIN.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final GroupRepository groupRepository;
    private final SubjectRepository subjectRepository;
    private final ChatMessageRepository chatMessageRepository;

    public List<UserProfileDto.Response> listUsers() {
        return userRepository.findAll().stream()
                .map(UserProfileDto.Response::from)
                .toList();
    }

    @Transactional
    public UserProfileDto.Response promote(UUID userId) {
        return setRole(userId, Role.ADMIN);
    }

    @Transactional
    public UserProfileDto.Response demote(UUID userId) {
        return setRole(userId, Role.USER);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        userRepository.delete(u);
    }

    public Map<String, Object> globalStats() {
        return Map.of(
                "totalUsers",   userRepository.count(),
                "totalGroups",  groupRepository.count(),
                "totalSessions", sessionRepository.count()
        );
    }

    /**
     * Statistiques globales detaillees pour le tableau de bord admin.
     * Retour conforme au type AdminGlobalStats cote Angular.
     */
    public Map<String, Object> globalStatsDetailed() {
        List<User> users    = userRepository.findAll();
        List<StudySession> all = sessionRepository.findAll();

        OffsetDateTime weekAgo = OffsetDateTime.now().minusDays(7);

        long totalUsers       = users.size();
        long adminUsers       = users.stream().filter(u -> u.getRole() == Role.ADMIN).count();
        long activeUsers      = totalUsers; // pas de champ disabled cote BD -> tous actifs
        long disabledUsers    = 0;
        long newUsersThisWeek = users.stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(weekAgo))
                .count();

        long totalSessions     = all.size();
        long completedSessions = all.stream().filter(s -> s.getStatus() == SessionStatus.COMPLETED).count();
        long plannedSessions   = all.stream().filter(s -> s.getStatus() == SessionStatus.PLANNED).count();
        long cancelledSessions = all.stream().filter(s -> s.getStatus() == SessionStatus.CANCELLED).count();
        double globalCompletionRate = totalSessions > 0
                ? Math.round((completedSessions * 1000.0 / totalSessions)) / 10.0
                : 0.0;

        // Productivite
        int totalMinutes = all.stream()
                .filter(s -> s.getStatus() == SessionStatus.COMPLETED)
                .mapToInt(s -> s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes())
                .sum();
        double totalStudiedHours = Math.round(totalMinutes / 60.0 * 10) / 10.0;
        int avgSessionDurationMin = completedSessions > 0
                ? (int) Math.round((double) totalMinutes / completedSessions)
                : 0;
        int longestSessionMin = all.stream()
                .filter(s -> s.getStatus() == SessionStatus.COMPLETED)
                .mapToInt(s -> s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes())
                .max().orElse(0);

        long totalGroups = groupRepository.count();
        long totalMessages = chatMessageRepository.countByDeletedFalse();

        // Tendance hebdomadaire : 7 dernieres semaines (sessions completed)
        WeekFields wf = WeekFields.of(Locale.FRANCE);
        LocalDate currentWeekStart = LocalDate.now().with(wf.dayOfWeek(), 1);
        List<String> weekLabels = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate weekStart = currentWeekStart.minusWeeks(i);
            weekLabels.add(String.format(
                    "%d-W%02d",
                    weekStart.get(wf.weekBasedYear()),
                    weekStart.get(wf.weekOfWeekBasedYear())
            ));
        }

        Map<String, long[]> weekStats = new TreeMap<>(); // week label -> [count, completedCount, totalMinutes]
        for (StudySession s : all) {
            OffsetDateTime start = s.getStartDateTime();
            if (start == null) continue;
            int week = start.get(wf.weekOfWeekBasedYear());
            int year = start.get(wf.weekBasedYear());
            String label = String.format("%d-W%02d", year, week);
            if (!weekLabels.contains(label)) continue;
            long[] entry = weekStats.computeIfAbsent(label, k -> new long[3]);
            entry[0]++; // total sessions
            if (s.getStatus() == SessionStatus.COMPLETED) {
                entry[1]++; // completed
                int m = s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes();
                entry[2] += m;
            }
        }
        List<Map<String, Object>> weeklyData = new ArrayList<>();
        for (String label : weekLabels) {
            long[] v = weekStats.getOrDefault(label, new long[3]);
            double rate = v[0] > 0 ? Math.round((v[1] * 1000.0 / v[0])) / 10.0 : 0.0;
            weeklyData.add(Map.of(
                    "week", label,
                    "sessions", v[0],
                    "completionRate", rate,
                    "totalMinutes", v[2]
            ));
        }

        // Top matieres par minutes etudiees
        Map<UUID, int[]> subjectAgg = new HashMap<>(); // subjectId -> [minutes, completedSessions]
        for (StudySession s : all) {
            if (s.getSubject() == null || s.getStatus() != SessionStatus.COMPLETED) continue;
            int m = s.getActualDuration() != null ? s.getActualDuration() : s.getDurationMinutes();
            int[] arr = subjectAgg.computeIfAbsent(s.getSubject().getId(), k -> new int[2]);
            arr[0] += m;
            arr[1]++;
        }
        List<Map<String, Object>> topSubjects = subjectAgg.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue()[0], a.getValue()[0]))
                .limit(5)
                .map(e -> {
                    var subject = subjectRepository.findById(e.getKey()).orElse(null);
                    long subjectSessions = all.stream()
                            .filter(s -> s.getSubject() != null && s.getSubject().getId().equals(e.getKey()))
                            .count();
                    double rate = subjectSessions > 0
                            ? Math.round((e.getValue()[1] * 1000.0 / subjectSessions)) / 10.0
                            : 0.0;
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("name",  subject != null ? subject.getName()  : "?");
                    out.put("minutes", e.getValue()[0]);
                    out.put("color", subject != null ? subject.getColor() : "#888");
                    out.put("completionRate", rate);
                    return out;
                })
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalUsers", totalUsers);
        result.put("activeUsers", activeUsers);
        result.put("adminUsers", adminUsers);
        result.put("disabledUsers", disabledUsers);
        result.put("newUsersThisWeek", newUsersThisWeek);
        result.put("totalSessions", totalSessions);
        result.put("completedSessions", completedSessions);
        result.put("plannedSessions", plannedSessions);
        result.put("cancelledSessions", cancelledSessions);
        result.put("globalCompletionRate", globalCompletionRate);
        result.put("totalGroups", totalGroups);
        result.put("totalMessages", totalMessages);
        result.put("totalStudiedHours", totalStudiedHours);
        result.put("avgSessionDurationMin", avgSessionDurationMin);
        result.put("longestSessionMin", longestSessionMin);
        result.put("weeklyData", weeklyData);
        result.put("topSubjects", topSubjects);
        return result;
    }

    private UserProfileDto.Response setRole(UUID userId, Role newRole) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        u.setRole(newRole);
        return UserProfileDto.Response.from(userRepository.save(u));
    }
}
