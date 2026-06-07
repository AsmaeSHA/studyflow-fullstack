package com.studyflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Active les jobs planifiés (rappels de session, calcul stats hebdo).
 */
@Configuration
@EnableScheduling
@EnableAsync
public class SchedulerConfig {
}
