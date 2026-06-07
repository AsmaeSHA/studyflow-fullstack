package com.studyflow.chat;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Salle de discussion d'un groupe (collection MongoDB chat_rooms).
 * Liee a un StudyGroup PostgreSQL via groupId (UUID en string).
 */
@Document(collection = "chat_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    private String id;

    @Indexed(unique = true)
    private String groupId;

    private Instant createdAt;

    @Builder.Default
    private boolean active = true;
}
