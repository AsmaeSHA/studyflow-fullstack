package com.studyflow.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8, max = 100, message = "Le mot de passe doit faire au moins 8 caracteres")
        String newPassword
) {}
