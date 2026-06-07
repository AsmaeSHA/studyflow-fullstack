package com.studyflow.chat;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Message de chat (collection chat_messages).
 * Indexes: { roomId: 1, sentAt: -1 }
 */
@Document(collection = "chat_messages")
@CompoundIndex(name = "idx_room_sentAt", def = "{'roomId': 1, 'sentAt': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    private String id;

    private String roomId;

    @Indexed
    private String senderId;

    private String senderName;

    private String content;

    private Instant sentAt;

    @Builder.Default
    private boolean edited = false;

    private Instant editedAt;

    @Builder.Default
    private boolean deleted = false;
}
