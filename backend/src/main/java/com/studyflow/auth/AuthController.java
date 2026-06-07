package com.studyflow.auth;

import com.studyflow.auth.dto.AuthResponse;
import com.studyflow.auth.dto.ForgotPasswordRequest;
import com.studyflow.auth.dto.LoginRequest;
import com.studyflow.auth.dto.RegisterRequest;
import com.studyflow.auth.dto.ResetPasswordRequest;
import com.studyflow.auth.passwordreset.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body == null ? null : body.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Le champ 'refreshToken' est requis");
        }
        return authService.refresh(refreshToken);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestBody(required = false) Map<String, String> body) {
        if (body != null) {
            authService.logout(body.get("refreshToken"));
        }
    }

    // -------------------- Forgot / Reset password --------------------

    /**
     * Demande un email de reinitialisation. Reponse toujours 204 pour ne pas
     * reveler si l'email existe en base.
     */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
    }

    /**
     * Reinitialise effectivement le mot de passe a partir du token recu par email.
     */
    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
    }
}
