package com.studyflow.chat;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Commentaire sur une session d'etude (collection comments).
 * sessionId : UUID StudySession ; authorId : UUID User.
 */
@Document(collection = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    @Indexed
    private String authorId;

    private String content;

    private Instant createdAt;

    private Instant updatedAt;

    @Builder.Default
    private boolean edited = false;
}
