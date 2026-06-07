package com.studyflow.analytics;

import com.studyflow.auth.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public DashboardSummary dashboard(@AuthenticationPrincipal User user) {
        return analyticsService.generateDashboard(user.getId());
    }

    @GetMapping("/stats")
    public List<AnalyticsDto.StatResponse> myStats(@AuthenticationPrincipal User user) {
        return analyticsService.listMyStats(user.getId());
    }

    @GetMapping("/stats/week")
    public AnalyticsDto.StatResponse week(@AuthenticationPrincipal User user,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return analyticsService.getWeek(user.getId(), weekStart);
    }

    @PostMapping("/stats/compute")
    public AnalyticsDto.StatResponse compute(@AuthenticationPrincipal User user,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return AnalyticsDto.StatResponse.from(analyticsService.computeWeeklyStats(user.getId(), weekStart));
    }
}
