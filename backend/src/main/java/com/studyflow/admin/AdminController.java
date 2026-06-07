package com.studyflow.admin;

import com.studyflow.user.dto.UserProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Routes administratives. Securisees par SecurityConfig (.requestMatchers("/api/admin/**").hasRole("ADMIN"))
 * + un @PreAuthorize defensive.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public List<UserProfileDto.Response> users() {
        return adminService.listUsers();
    }

    @PostMapping("/users/{userId}/promote")
    public UserProfileDto.Response promote(@PathVariable UUID userId) {
        return adminService.promote(userId);
    }

    @PostMapping("/users/{userId}/demote")
    public UserProfileDto.Response demote(@PathVariable UUID userId) {
        return adminService.demote(userId);
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID userId) {
        adminService.deleteUser(userId);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return adminService.globalStats();
    }

    /** Stats globales detaillees pour le dashboard admin (cf. AdminGlobalStats cote Angular). */
    @GetMapping("/stats/global")
    public Map<String, Object> globalStatsDetailed() {
        return adminService.globalStatsDetailed();
    }
}
