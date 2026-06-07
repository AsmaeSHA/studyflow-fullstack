package com.studyflow.group;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyflow.session.SessionStatus;
import com.studyflow.session.StudySession;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class GroupDto {

    @Builder
    public record Response(
            UUID id,
            String name,
            String description,
            @JsonProperty("isPrivate") boolean isPrivate,
            boolean privateGroup,
            Integer maxMembers,
            String imageUrl,
            int memberCount,
            UUID ownerId,
            String ownerName,
            OffsetDateTime createdAt
    ) {
        public static Response from(StudyGroup g) {
            return Response.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .description(g.getDescription())
                    .isPrivate(g.isPrivateGroup())
                    .privateGroup(g.isPrivateGroup())
                    .maxMembers(g.getMaxMembers())
                    .imageUrl(g.getImageUrl())
                    .memberCount(g.getMemberCount())
                    .ownerId(g.getOwner().getId())
                    .ownerName(g.getOwner().getFullName())
                    .createdAt(g.getCreatedAt())
                    .build();
        }
    }

    public record CreateOrUpdate(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 2000) String description,
            Boolean privateGroup,
            @Min(2) Integer maxMembers,
            @Size(max = 2000) String imageUrl
    ) {}

    @Builder
    public record MemberResponse(
            UUID userId,
            UUID groupId,
            String email,
            String userName,
            String fullName,
            MemberRole role,
            @JsonProperty("isActive") boolean isActive,
            boolean active,
            OffsetDateTime joinedAt
    ) {
        public static MemberResponse from(GroupMembership m) {
            return MemberResponse.builder()
                    .userId(m.getUser().getId())
                    .groupId(m.getGroup().getId())
                    .email(m.getUser().getEmail())
                    .userName(m.getUser().getFullName())
                    .fullName(m.getUser().getFullName())
                    .role(m.getRole())
                    .isActive(m.isActive())
                    .active(m.isActive())
                    .joinedAt(m.getJoinedAt())
                    .build();
        }
    }

    public record ShareSessionRequest(
            @NotBlank String sessionId,
            @Size(max = 500) String message
    ) {}

    @Builder
    public record SharedSessionResponse(
            UUID id,
            UUID groupId,
            UUID sessionId,
            String sessionTitle,
            String title,
            String description,
            UUID subjectId,
            String subjectName,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            Integer plannedDuration,
            Integer actualDuration,
            SessionStatus status,
            UUID ownerId,
            String ownerName,
            UUID sharedById,
            String sharedBy,
            OffsetDateTime sharedAt,
            String message,
            boolean sharedByCurrentUser,
            boolean acceptedByCurrentUser,
            boolean declinedByCurrentUser
    ) {
        public static SharedSessionResponse from(SharedSession s) {
            return from(s, false);
        }

        public static SharedSessionResponse from(SharedSession s,
                                                 boolean sharedByCurrentUser) {
            StudySession session = s.getSession();
            return SharedSessionResponse.builder()
                    .id(s.getId())
                    .groupId(s.getGroup().getId())
                    .sessionId(session.getId())
                    .sessionTitle(session.getTitle())
                    .title(session.getTitle())
                    .description(session.getNotes())
                    .subjectId(session.getSubject() != null ? session.getSubject().getId() : null)
                    .subjectName(session.getSubject() != null ? session.getSubject().getName() : null)
                    .startDateTime(session.getStartDateTime())
                    .endDateTime(session.getEndDateTime())
                    .plannedDuration(session.getPlannedDuration())
                    .actualDuration(session.getActualDuration())
                    .status(session.getStatus())
                    .ownerId(session.getUser().getId())
                    .ownerName(session.getUser().getFullName())
                    .sharedById(s.getSharedBy() != null ? s.getSharedBy().getId() : null)
                    .sharedBy(s.getSharedBy() != null ? s.getSharedBy().getFullName() : null)
                    .sharedAt(s.getSharedAt())
                    .message(s.getMessage())
                    .sharedByCurrentUser(sharedByCurrentUser)
                    .acceptedByCurrentUser(false)
                    .declinedByCurrentUser(false)
                    .build();
        }
    }

    @Builder
    public record SharedSessionDecisionResponse(
            SharedSessionResponse sharedSession,
            String decision,
            UUID personalSessionId,
            String message
    ) {}

    @Builder
    public record GroupSessionResponse(
            UUID id,
            UUID userId,
            String userName,
            UUID subjectId,
            String subjectName,
            String title,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            SessionStatus status,
            Integer plannedDuration,
            Integer actualDuration,
            String notes
    ) {
        public static GroupSessionResponse from(StudySession s) {
            return GroupSessionResponse.builder()
                    .id(s.getId())
                    .userId(s.getUser().getId())
                    .userName(s.getUser().getFullName())
                    .subjectId(s.getSubject() != null ? s.getSubject().getId() : null)
                    .subjectName(s.getSubject() != null ? s.getSubject().getName() : null)
                    .title(s.getTitle())
                    .startDateTime(s.getStartDateTime())
                    .endDateTime(s.getEndDateTime())
                    .status(s.getStatus())
                    .plannedDuration(s.getPlannedDuration())
                    .actualDuration(s.getActualDuration())
                    .notes(s.getNotes())
                    .build();
        }
    }

    @Builder
    public record GroupSessionStats(
            long totalSessions,
            long completedSessions,
            long plannedSessions,
            long totalPlannedMinutes,
            long totalActualMinutes,
            Map<String, Long> sessionsBySubject,
            Map<String, Long> minutesByMember
    ) {}

    @Builder
    public record GroupSessionsDashboard(
            List<GroupSessionResponse> sessions,
            GroupSessionStats stats
    ) {}
}
