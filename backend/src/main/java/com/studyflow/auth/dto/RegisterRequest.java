package com.studyflow.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 1, max = 100)
        String firstName,

        @NotBlank @Size(min = 1, max = 100)
        String lastName,

        @NotBlank @Size(min = 8, max = 100, message = "Le mot de passe doit faire au moins 8 caractères")
        String password
) {}
