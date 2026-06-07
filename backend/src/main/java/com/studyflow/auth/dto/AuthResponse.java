package com.studyflow.auth.dto;

import com.studyflow.auth.model.Role;
import lombok.Builder;

import java.util.UUID;

@Builder
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long   expiresInMs,
        UserSummary user
) {
    @Builder
    public record UserSummary(
            UUID id,
            String email,
            String firstName,
            String lastName,
            Role role
    ) {}
}
