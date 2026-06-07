package com.studyflow.auth.passwordreset;

import com.studyflow.auth.RefreshTokenRepository;
import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final int TOKEN_BYTES = 48;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Value("${app.password-reset.expiration-minutes:30}")
    private int expirationMinutes;

    /**
     * Cree un token de reset si l'email existe et envoie l'email.
     * Reponse silencieuse pour ne pas reveler quels comptes existent.
     */
    @Transactional
    public void requestReset(String email) {
        Optional<User> opt = userRepository.findByEmail(email.toLowerCase().trim());
        if (opt.isEmpty()) {
            log.info("Demande de reset pour email inexistant : {}", email);
            return; // pas d'erreur exposee
        }
        User user = opt.get();

        // Invalide tous les tokens precedents non utilises (un seul actif a la fois)
        tokenRepository.invalidateAllForUser(user);

        String tokenValue = generateToken();
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(OffsetDateTime.now().plusMinutes(expirationMinutes))
                .used(false)
                .build();
        tokenRepository.save(token);

        String link = frontendBaseUrl + "/auth/reset-password?token=" + tokenValue;
        emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), link);
    }

    /**
     * Reinitialise le mot de passe a partir d'un token valide.
     */
    @Transactional
    public void resetPassword(String tokenValue, String newPassword) {
        PasswordResetToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new UnauthorizedException("Token de reinitialisation invalide ou inexistant"));

        if (!token.isUsable()) {
            throw new UnauthorizedException("Token expire ou deja utilise");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);

        // Pour la securite : on revoque tous les refresh tokens existants
        refreshTokenRepository.revokeAllForUser(user);

        log.info("Mot de passe reinitialise pour {}", user.getEmail());
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
