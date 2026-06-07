package com.studyflow.session.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyflow.session.SessionStatus;
import com.studyflow.session.StudySession;
import jakarta.validation.constraints.*;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

public class SessionDto {

    /** Vue API d'une session d'etude. */
    @Builder
    public record Response(
            UUID id,
            UUID subjectId,
            String subjectName,
            String subjectColor,
            String title,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            SessionStatus status,
            @JsonProperty("isShared")
            boolean shared,
            Integer plannedDuration,
            Integer actualDuration,
            String notes
    ) {
        public static Response from(StudySession s) {
            return Response.builder()
                    .id(s.getId())
                    .subjectId(s.getSubject() != null ? s.getSubject().getId() : null)
                    .subjectName(s.getSubject() != null ? s.getSubject().getName() : null)
                    .subjectColor(s.getSubject() != null ? s.getSubject().getColor() : null)
                    .title(s.getTitle())
                    .startDateTime(s.getStartDateTime())
                    .endDateTime(s.getEndDateTime())
                    .status(s.getStatus())
                    .shared(s.isShared())
                    .plannedDuration(s.getDurationMinutes())
                    .actualDuration(s.getActualDuration())
                    .notes(s.getNotes())
                    .build();
        }
    }

    /** Payload de creation / mise a jour. */
    public record CreateOrUpdate(
            UUID subjectId,
            @NotBlank @Size(max = 200) String title,
            @NotNull OffsetDateTime startDateTime,
            @NotNull OffsetDateTime endDateTime,
            @Size(max = 2000) String notes
    ) {}

    /** Payload pour replanifier. */
    public record Reschedule(
            @NotNull OffsetDateTime newStartDateTime
    ) {}

    /** Payload pour cloturer une session avec une duree reelle. */
    public record Complete(
            @PositiveOrZero Integer actualDuration,
            @Size(max = 2000) String notes
    ) {}
}
