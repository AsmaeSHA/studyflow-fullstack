package com.studyflow.notification;

import com.studyflow.auth.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationDto.Response> list(@AuthenticationPrincipal User user,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return notificationService.list(user.getId(), page, size);
    }

    @GetMapping("/unread")
    public List<NotificationDto.Response> unread(@AuthenticationPrincipal User user) {
        return notificationService.listUnread(user.getId());
    }

    @GetMapping("/unread/count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal User user) {
        return Map.of("count", notificationService.countUnread(user.getId()));
    }

    @PostMapping("/{id}/read")
    public NotificationDto.Response markAsRead(@AuthenticationPrincipal User user, @PathVariable String id) {
        return notificationService.markAsRead(user.getId(), id);
    }

    @PatchMapping("/{id}/read")
    public NotificationDto.Response patchMarkAsRead(@AuthenticationPrincipal User user, @PathVariable String id) {
        return notificationService.markAsRead(user.getId(), id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user.getId());
    }

    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void patchMarkAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable String id) {
        notificationService.delete(user.getId(), id);
    }
}
