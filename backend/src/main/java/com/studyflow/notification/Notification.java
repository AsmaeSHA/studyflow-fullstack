package com.studyflow.notification;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Notification utilisateur (collection notifications).
 * Indexes: { userId: 1, isRead: 1, createdAt: -1 }
 */
@Document(collection = "notifications")
@CompoundIndex(name = "idx_user_unread_createdAt", def = "{'userId': 1, 'isRead': 1, 'createdAt': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    private String id;

    private String userId;

    private NotificationType type;

    private String title;

    private String message;

    @Builder.Default
    private boolean read = false;

    private Instant createdAt;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    public void markAsRead() {
        this.read = true;
    }
}
