package com.studyflow.auth;

import com.studyflow.auth.model.RefreshToken;
import com.studyflow.auth.model.User;
import com.studyflow.config.JwtConfig;
import com.studyflow.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Cycle de vie des refresh-tokens persistés.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        String tokenValue = jwtService.generateRefreshToken(user);

        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(OffsetDateTime.now().plus(jwtConfig.getRefreshTokenExpirationMs(), ChronoUnit.MILLIS))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(token);
    }

    @Transactional(readOnly = true)
    public RefreshToken verify(String tokenValue) {
        RefreshToken token = refreshTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new UnauthorizedException("Refresh token introuvable"));

        if (!token.isUsable()) {
            throw new UnauthorizedException("Refresh token expiré ou révoqué");
        }
        return token;
    }

    @Transactional
    public void revoke(String tokenValue) {
        refreshTokenRepository.findByToken(tokenValue).ifPresent(t -> {
            t.revoke();
            refreshTokenRepository.save(t);
        });
    }

    @Transactional
    public void revokeAllForUser(User user) {
        refreshTokenRepository.revokeAllForUser(user);
    }
}
