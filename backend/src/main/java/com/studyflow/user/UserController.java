package com.studyflow.user;

import com.studyflow.auth.model.User;
import com.studyflow.user.dto.AvailabilityDto;
import com.studyflow.user.dto.UserProfileDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ---- Profil ----
    @GetMapping("/me")
    public UserProfileDto.Response me(@AuthenticationPrincipal User user) {
        return userService.getProfile(user.getId());
    }

    @PutMapping("/me")
    public UserProfileDto.Response updateMe(@AuthenticationPrincipal User user,
                                            @Valid @RequestBody UserProfileDto.UpdateRequest body) {
        return userService.updateProfile(user.getId(), body);
    }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal User user,
                               @Valid @RequestBody UserProfileDto.ChangePasswordRequest body) {
        userService.changePassword(user.getId(), body);
    }

    // ---- Disponibilités ----
    @GetMapping("/me/availabilities")
    public List<AvailabilityDto.Response> myAvailabilities(@AuthenticationPrincipal User user) {
        return userService.listAvailabilities(user.getId());
    }

    @PostMapping("/me/availabilities")
    @ResponseStatus(HttpStatus.CREATED)
    public AvailabilityDto.Response addAvailability(@AuthenticationPrincipal User user,
                                                    @Valid @RequestBody AvailabilityDto.CreateOrUpdate body) {
        return userService.addAvailability(user.getId(), body);
    }

    @DeleteMapping("/me/availabilities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAvailability(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        userService.deleteAvailability(user.getId(), id);
    }
}
