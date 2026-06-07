package com.studyflow.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.time.Instant;
import java.util.Map;

public class NotificationDto {

    @Builder
    public record Response(
            String id,
            String userId,
            NotificationType type,
            String title,
            String message,
            @JsonProperty("isRead") boolean isRead,
            boolean read,
            Instant createdAt,
            Map<String, Object> metadata
    ) {
        public static Response from(Notification n) {
            return Response.builder()
                    .id(n.getId())
                    .userId(n.getUserId())
                    .type(n.getType())
                    .title(n.getTitle())
                    .message(n.getMessage())
                    .isRead(n.isRead())
                    .read(n.isRead())
                    .createdAt(n.getCreatedAt())
                    .metadata(n.getMetadata())
                    .build();
        }
    }
}
