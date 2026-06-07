package com.studyflow.subject;

import jakarta.validation.constraints.*;
import lombok.Builder;

import java.util.UUID;

public class SubjectDto {

    @Builder
    public record Response(
            UUID id,
            String name,
            String color,
            Integer priority,
            Float weeklyGoalHours,
            Integer maxSessionDuration,
            String description
    ) {
        public static Response from(Subject s) {
            return Response.builder()
                    .id(s.getId())
                    .name(s.getName())
                    .color(s.getColor())
                    .priority(s.getPriority())
                    .weeklyGoalHours(s.getWeeklyGoalHours())
                    .maxSessionDuration(s.getMaxSessionDuration())
                    .description(s.getDescription())
                    .build();
        }
    }

    public record CreateOrUpdate(
            @NotBlank @Size(max = 150) String name,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Couleur attendue au format hexa (ex: #FF00AA)")
            String color,
            @Min(1) @Max(5) Integer priority,
            @PositiveOrZero Float weeklyGoalHours,
            @Min(15) @Max(480) Integer maxSessionDuration,
            @Size(max = 1000) String description
    ) {}
}
