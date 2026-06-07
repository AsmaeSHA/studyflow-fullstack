package com.studyflow.presence;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PresenceService {

    public PresenceDto.Summary list(UUID userId, UUID groupId) {
        return PresenceDto.Summary.builder()
                .groupId(groupId)
                .onlineCount(0)
                .members(List.of())
                .build();
    }

    public PresenceDto.Response mark(UUID userId, UUID groupId, PresenceStatus status) {
        return PresenceDto.Response.builder()
                .userId(userId)
                .groupId(groupId)
                .status(status)
                .lastSeen(OffsetDateTime.now())
                .build();
    }
}
