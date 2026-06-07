package com.studyflow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Bind les propriétés `app.jwt.*` du fichier application.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "app.jwt")
@Getter
@Setter
public class JwtConfig {

    private String secret;
    private long accessTokenExpirationMs;
    private long refreshTokenExpirationMs;
}
