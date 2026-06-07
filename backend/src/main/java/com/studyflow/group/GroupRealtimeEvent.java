package com.studyflow.group;

import lombok.Builder;

import java.time.Instant;
import java.util.Map;

@Builder
public record GroupRealtimeEvent(
        String type,
        String groupId,
        String actorId,
        String sharedSessionId,
        String sessionId,
        Object payload,
        Map<String, String> metadata,
        Instant sentAt
) {
    public static GroupRealtimeEvent of(String type,
                                        String groupId,
                                        String actorId,
                                        String sharedSessionId,
                                        String sessionId,
                                        Object payload,
                                        Map<String, String> metadata) {
        return GroupRealtimeEvent.builder()
                .type(type)
                .groupId(groupId)
                .actorId(actorId)
                .sharedSessionId(sharedSessionId)
                .sessionId(sessionId)
                .payload(payload)
                .metadata(metadata)
                .sentAt(Instant.now())
                .build();
    }
}
