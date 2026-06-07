package com.studyflow.user;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.exception.UnauthorizedException;
import com.studyflow.user.dto.AvailabilityDto;
import com.studyflow.user.dto.UserProfileDto;
import com.studyflow.user.model.Availability;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AvailabilityRepository availabilityRepository;
    private final PasswordEncoder passwordEncoder;

    // ----- Profil -----

    @Transactional(readOnly = true)
    public UserProfileDto.Response getProfile(UUID userId) {
        return UserProfileDto.Response.from(load(userId));
    }

    @Transactional
    public UserProfileDto.Response updateProfile(UUID userId, UserProfileDto.UpdateRequest req) {
        User user = load(userId);
        user.setFirstName(req.firstName().trim());
        user.setLastName(req.lastName().trim());

        // Email optionnel : si fourni et different, on verifie l'unicite avant de mettre a jour
        if (req.email() != null && !req.email().isBlank()) {
            String normalized = req.email().trim().toLowerCase();
            if (!normalized.equals(user.getEmail())) {
                if (userRepository.existsByEmail(normalized)) {
                    throw new IllegalArgumentException("Email deja utilise : " + normalized);
                }
                user.setEmail(normalized);
            }
        }

        return UserProfileDto.Response.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(UUID userId, UserProfileDto.ChangePasswordRequest req) {
        User user = load(userId);
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Mot de passe actuel incorrect");
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }

    // ----- Disponibilités -----

    @Transactional(readOnly = true)
    public List<AvailabilityDto.Response> listAvailabilities(UUID userId) {
        return availabilityRepository.findByUserIdOrderByDayOfWeekAscStartTimeAsc(userId)
                .stream().map(AvailabilityDto.Response::from).toList();
    }

    @Transactional
    public AvailabilityDto.Response addAvailability(UUID userId, AvailabilityDto.CreateOrUpdate body) {
        if (body.endTime().isBefore(body.startTime()) || body.endTime().equals(body.startTime())) {
            throw new IllegalArgumentException("L'heure de fin doit être strictement après l'heure de début");
        }
        User user = load(userId);
        Availability a = Availability.builder()
                .user(user)
                .dayOfWeek(body.dayOfWeek())
                .startTime(body.startTime())
                .endTime(body.endTime())
                .recurring(body.recurring() == null ? Boolean.TRUE : body.recurring())
                .validFrom(body.validFrom())
                .validUntil(body.validUntil())
                .build();
        return AvailabilityDto.Response.from(availabilityRepository.save(a));
    }

    @Transactional
    public void deleteAvailability(UUID userId, UUID availabilityId) {
        Availability a = availabilityRepository.findById(availabilityId)
                .orElseThrow(() -> ResourceNotFoundException.of("Availability", availabilityId));
        if (!a.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Cette disponibilité ne vous appartient pas");
        }
        availabilityRepository.delete(a);
    }

    // ----- helpers -----

    private User load(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }
}
