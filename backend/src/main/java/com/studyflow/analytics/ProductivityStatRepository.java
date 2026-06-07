package com.studyflow.analytics;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductivityStatRepository extends MongoRepository<ProductivityStat, String> {

    Optional<ProductivityStat> findByUserIdAndWeekStart(String userId, LocalDate weekStart);

    List<ProductivityStat> findByUserIdOrderByWeekStartDesc(String userId);
}
