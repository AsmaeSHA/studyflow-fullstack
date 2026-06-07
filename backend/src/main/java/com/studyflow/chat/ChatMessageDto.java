package com.studyflow.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.Instant;

public class ChatMessageDto {

    @Builder
    public record Response(
            String id,
            String roomId,
            String senderId,
            String senderName,
            String authorId,
            String authorName,
            String content,
            Instant sentAt,
            boolean edited,
            boolean isEdited,
            Instant editedAt,
            boolean deleted,
            boolean isDeleted
    ) {
        public static Response from(ChatMessage m) {
            return from(m, null);
        }

        public static Response from(ChatMessage m, String senderName) {
            String resolvedSenderName = senderName != null ? senderName : m.getSenderName();
            return Response.builder()
                    .id(m.getId())
                    .roomId(m.getRoomId())
                    .senderId(m.getSenderId())
                    .senderName(resolvedSenderName)
                    .authorId(m.getSenderId())
                    .authorName(resolvedSenderName)
                    .content(m.isDeleted() ? "[message supprime]" : m.getContent())
                    .sentAt(m.getSentAt())
                    .edited(m.isEdited())
                    .isEdited(m.isEdited())
                    .editedAt(m.getEditedAt())
                    .deleted(m.isDeleted())
                    .isDeleted(m.isDeleted())
                    .build();
        }
    }

    @Builder
    public record RoomResponse(
            String id,
            String groupId,
            Instant createdAt,
            boolean active
    ) {
        public static RoomResponse from(ChatRoom room) {
            return RoomResponse.builder()
                    .id(room.getId())
                    .groupId(room.getGroupId())
                    .createdAt(room.getCreatedAt())
                    .active(room.isActive())
                    .build();
        }
    }

    public record Send(
            @NotBlank @Size(max = 2000) String content
    ) {}

    public record Edit(
            @NotBlank @Size(max = 2000) String content
    ) {}

    @Builder
    public record CommentResponse(
            String id,
            String sessionId,
            String authorId,
            String authorName,
            String content,
            Instant createdAt,
            Instant updatedAt,
            boolean edited
    ) {
        public static CommentResponse from(Comment c) {
            return from(c, null);
        }

        public static CommentResponse from(Comment c, String authorName) {
            return CommentResponse.builder()
                    .id(c.getId())
                    .sessionId(c.getSessionId())
                    .authorId(c.getAuthorId())
                    .authorName(authorName)
                    .content(c.getContent())
                    .createdAt(c.getCreatedAt())
                    .updatedAt(c.getUpdatedAt())
                    .edited(c.isEdited())
                    .build();
        }
    }

    public record CreateComment(
            @NotBlank @Size(max = 2000) String content
    ) {}
}
