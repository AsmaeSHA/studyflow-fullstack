package com.studyflow.auth;

import com.studyflow.auth.dto.AuthResponse;
import com.studyflow.auth.dto.LoginRequest;
import com.studyflow.auth.dto.RegisterRequest;
import com.studyflow.auth.model.RefreshToken;
import com.studyflow.auth.model.Role;
import com.studyflow.auth.model.User;
import com.studyflow.config.JwtConfig;
import com.studyflow.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email deja utilise : " + request.email());
        }

        User user = User.builder()
                .email(request.email().trim().toLowerCase())
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .build();

        user = userRepository.save(user);
        log.info("Nouvel utilisateur enregistre : {}", user.getEmail());

        return buildResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (BadCredentialsException e) {
            throw new UnauthorizedException("Email ou mot de passe incorrect");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UnauthorizedException("Utilisateur introuvable"));

        return buildResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {
        RefreshToken token = refreshTokenService.verify(refreshTokenValue);
        // Rotation : on revoque l'ancien et on emet un nouveau couple.
        refreshTokenService.revoke(refreshTokenValue);
        return buildResponse(token.getUser());
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenService.revoke(refreshTokenValue);
        }
    }

    private AuthResponse buildResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresInMs(jwtConfig.getAccessTokenExpirationMs())
                .user(AuthResponse.UserSummary.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .role(user.getRole())
                        .build())
                .build();
    }
}
