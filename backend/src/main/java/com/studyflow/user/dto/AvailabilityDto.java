package com.studyflow.user.dto;

import com.studyflow.user.model.Availability;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public class AvailabilityDto {

    @Builder
    public record Response(
            UUID id,
            Short dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            boolean recurring,
            LocalDate validFrom,
            LocalDate validUntil
    ) {
        public static Response from(Availability a) {
            return Response.builder()
                    .id(a.getId())
                    .dayOfWeek(a.getDayOfWeek())
                    .startTime(a.getStartTime())
                    .endTime(a.getEndTime())
                    .recurring(a.isRecurring())
                    .validFrom(a.getValidFrom())
                    .validUntil(a.getValidUntil())
                    .build();
        }
    }

    public record CreateOrUpdate(
            @NotNull @Min(1) @Max(7) Short dayOfWeek,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            Boolean recurring,
            LocalDate validFrom,
            LocalDate validUntil
    ) {}
}
