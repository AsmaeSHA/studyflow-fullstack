package com.studyflow.auth.oauth;

import com.studyflow.auth.JwtService;
import com.studyflow.auth.RefreshTokenService;
import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.RefreshToken;
import com.studyflow.auth.model.Role;
import com.studyflow.auth.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Handler appele apres un login OAuth2 reussi (Google).
 * - Recupere les infos du user Google
 * - Cree le user en BD s'il n'existe pas, sinon le met a jour
 * - Genere un JWT + refresh token
 * - Redirige vers le frontend avec les tokens en query params
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                         HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String email = oauthUser.getAttribute("email");
        String firstName = oauthUser.getAttribute("given_name");
        String lastName  = oauthUser.getAttribute("family_name");

        if (email == null || email.isBlank()) {
            log.warn("OAuth2 sans email recu, refus.");
            response.sendRedirect(frontendBaseUrl + "/auth/login?error=oauth_no_email");
            return;
        }

        // Recherche ou cree le user en BD
        User user = userRepository.findByEmail(email.toLowerCase().trim())
            .orElseGet(() -> {
                User created = User.builder()
                        .email(email.toLowerCase().trim())
                        .firstName(firstName != null ? firstName : email.split("@")[0])
                        .lastName(lastName != null ? lastName : "")
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))  // mdp random non utilisable
                        .role(Role.USER)
                        .build();
                User saved = userRepository.save(created);
                log.info("Nouvel utilisateur OAuth2 cree : {}", email);
                return saved;
            });

        // Genere les tokens
        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        // Redirige vers le frontend avec les tokens en query params
        // Le composant OAuthCallbackComponent les recupere et persist
        String target = frontendBaseUrl + "/auth/oauth-callback"
                + "?accessToken="  + URLEncoder.encode(accessToken,  StandardCharsets.UTF_8)
                + "&refreshToken=" + URLEncoder.encode(refreshToken.getToken(), StandardCharsets.UTF_8)
                + "&role="         + user.getRole().name();

        log.info("OAuth2 success, redirection vers {} (user={})", frontendBaseUrl, email);
        response.sendRedirect(target);
    }
}
