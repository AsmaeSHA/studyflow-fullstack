package com.studyflow.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);

    long countByUserIdAndReadFalse(String userId);

    @Query(value = "{ 'userId': ?0, 'metadata.dedupeKey': ?1 }", exists = true)
    boolean existsByUserIdAndDedupeKey(String userId, String dedupeKey);
}
