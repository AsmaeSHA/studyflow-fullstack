package com.studyflow.group;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

public class InvitationDto {

    @Builder
    public record Response(
            UUID id,
            UUID groupId,
            String groupName,
            UUID senderId,
            String senderName,
            UUID recipientId,
            String recipientEmail,
            String message,
            InvitationStatus status,
            OffsetDateTime sentAt,
            OffsetDateTime respondedAt,
            OffsetDateTime expiresAt
    ) {
        public static Response from(GroupInvitation i) {
            return Response.builder()
                    .id(i.getId())
                    .groupId(i.getGroup().getId())
                    .groupName(i.getGroup().getName())
                    .senderId(i.getSender().getId())
                    .senderName(i.getSender().getFullName())
                    .recipientId(i.getRecipient().getId())
                    .recipientEmail(i.getRecipient().getEmail())
                    .message(i.getMessage())
                    .status(i.getStatus())
                    .sentAt(i.getSentAt())
                    .respondedAt(i.getRespondedAt())
                    .expiresAt(i.getExpiresAt())
                    .build();
        }
    }

    public record Create(
            @NotBlank @Email String recipientEmail,
            @Size(max = 500) String message
    ) {}
}
