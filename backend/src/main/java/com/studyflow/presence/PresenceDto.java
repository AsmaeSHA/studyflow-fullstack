package com.studyflow.presence;

import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class PresenceDto {

    @Builder
    public record Response(
            UUID userId,
            UUID groupId,
            PresenceStatus status,
            OffsetDateTime lastSeen
    ) {}

    @Builder
    public record Summary(
            UUID groupId,
            long onlineCount,
            List<Response> members
    ) {}
}
