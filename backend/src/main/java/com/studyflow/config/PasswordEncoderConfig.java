package com.studyflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Le PasswordEncoder est isole ici pour eviter une dependance circulaire avec
 * SecurityConfig qui dependrait de OAuth2SuccessHandler qui depend lui-meme de
 * PasswordEncoder.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
