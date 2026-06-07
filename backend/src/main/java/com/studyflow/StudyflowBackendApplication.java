package com.studyflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ConfigurationPropertiesScan
@EntityScan(basePackages = {
        "com.studyflow.auth",
        "com.studyflow.user",
        "com.studyflow.subject",
        "com.studyflow.session",
        "com.studyflow.group"
})
@EnableJpaRepositories(basePackages = {
        "com.studyflow.auth",
        "com.studyflow.user",
        "com.studyflow.subject",
        "com.studyflow.session",
        "com.studyflow.group"
})
public class StudyflowBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyflowBackendApplication.class, args);
    }
}
