package com.studyflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Active l'audit (createdAt/updatedAt) et limite le scan des repos
 * Mongo aux packages ne contenant que des documents Mongo.
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = {
        "com.studyflow.chat",
        "com.studyflow.notification",
        "com.studyflow.analytics"
})
public class MongoConfig {
}
