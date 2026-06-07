package com.studyflow.user.dto;

import com.studyflow.auth.model.Role;
import com.studyflow.auth.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

public class UserProfileDto {

    @Builder
    public record Response(
            UUID id,
            String email,
            String firstName,
            String lastName,
            Role role,
            OffsetDateTime createdAt
    ) {
        public static Response from(User u) {
            return Response.builder()
                    .id(u.getId())
                    .email(u.getEmail())
                    .firstName(u.getFirstName())
                    .lastName(u.getLastName())
                    .role(u.getRole())
                    .createdAt(u.getCreatedAt())
                    .build();
        }
    }

    public record UpdateRequest(
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @Email @Size(max = 255) String email
    ) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100) String newPassword
    ) {}
}
