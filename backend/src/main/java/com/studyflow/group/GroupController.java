package com.studyflow.group;

import com.studyflow.auth.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    // --- Groupes ---
    @GetMapping
    public List<GroupDto.Response> myGroups(@AuthenticationPrincipal User user) {
        return groupService.listForUser(user.getId());
    }

    @GetMapping("/public")
    public List<GroupDto.Response> publicGroups() {
        return groupService.listPublic();
    }

    @GetMapping("/{id}")
    public GroupDto.Response get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return groupService.getOne(user.getId(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupDto.Response create(@AuthenticationPrincipal User user,
                                    @Valid @RequestBody GroupDto.CreateOrUpdate body) {
        return groupService.create(user.getId(), body);
    }

    @PutMapping("/{id}")
    public GroupDto.Response update(@AuthenticationPrincipal User user,
                                    @PathVariable UUID id,
                                    @Valid @RequestBody GroupDto.CreateOrUpdate body) {
        return groupService.update(user.getId(), id, body);
    }

    @PostMapping("/upload-image")
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Image vide");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Le fichier doit etre une image");
        }
        String extension = extensionFrom(file.getOriginalFilename(), contentType);
        String filename = UUID.randomUUID() + extension;
        Path uploadDir = Path.of("uploads", "groups").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        String imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/groups/")
                .path(filename)
                .toUriString();
        return Map.of("imageUrl", imageUrl);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        groupService.delete(user.getId(), id);
    }

    // --- Membres ---
    @GetMapping("/{id}/members")
    public List<GroupDto.MemberResponse> members(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return groupService.listMembers(user.getId(), id);
    }

    @PostMapping("/{id}/leave")
    public void leave(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        groupService.leave(user.getId(), id);
    }

    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@AuthenticationPrincipal User actor,
                             @PathVariable UUID id,
                             @PathVariable UUID userId) {
        groupService.removeMember(actor.getId(), id, userId);
    }

    @PostMapping("/{id}/members/{userId}/role")
    public void changeRole(@AuthenticationPrincipal User actor,
                           @PathVariable UUID id,
                           @PathVariable UUID userId,
                           @RequestBody Map<String, String> body) {
        MemberRole role = MemberRole.valueOf(body.get("role"));
        groupService.changeRole(actor.getId(), id, userId, role);
    }

    // --- Invitations ---
    @PostMapping("/{id}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationDto.Response invite(@AuthenticationPrincipal User user,
                                         @PathVariable UUID id,
                                         @Valid @RequestBody InvitationDto.Create body) {
        return groupService.invite(user.getId(), id, body);
    }

    @GetMapping("/invitations/pending")
    public List<InvitationDto.Response> myPending(@AuthenticationPrincipal User user) {
        return groupService.listMyPendingInvitations(user.getId());
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public InvitationDto.Response accept(@AuthenticationPrincipal User user, @PathVariable UUID invitationId) {
        return groupService.respondInvitation(user.getId(), invitationId, true);
    }

    @PostMapping("/invitations/{invitationId}/decline")
    public InvitationDto.Response decline(@AuthenticationPrincipal User user, @PathVariable UUID invitationId) {
        return groupService.respondInvitation(user.getId(), invitationId, false);
    }

    // --- Sessions partagees ---
    @PostMapping("/{id}/shared-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupDto.SharedSessionResponse shareSession(@AuthenticationPrincipal User user,
                                                       @PathVariable UUID id,
                                                       @Valid @RequestBody GroupDto.ShareSessionRequest body) {
        return groupService.shareSession(user.getId(), id, body);
    }

    @GetMapping("/{id}/shared-sessions")
    public List<GroupDto.SharedSessionResponse> listShared(@AuthenticationPrincipal User user,
                                                           @PathVariable UUID id) {
        return groupService.listSharedSessions(user.getId(), id);
    }

    @GetMapping("/{id}/shareable-sessions")
    public List<com.studyflow.session.dto.SessionDto.Response> listShareableSessions(@AuthenticationPrincipal User user,
                                                                                     @PathVariable UUID id) {
        return groupService.listShareableSessions(user.getId(), id);
    }

    @PostMapping("/{id}/shared-sessions/{sharedSessionId}/accept")
    public GroupDto.SharedSessionDecisionResponse acceptSharedSession(@AuthenticationPrincipal User user,
                                                                      @PathVariable UUID id,
                                                                      @PathVariable UUID sharedSessionId) {
        return groupService.acceptSharedSession(user.getId(), id, sharedSessionId);
    }

    @PostMapping("/{id}/shared-sessions/{sharedSessionId}/decline")
    public GroupDto.SharedSessionDecisionResponse declineSharedSession(@AuthenticationPrincipal User user,
                                                                       @PathVariable UUID id,
                                                                       @PathVariable UUID sharedSessionId) {
        return groupService.declineSharedSession(user.getId(), id, sharedSessionId);
    }

    @GetMapping("/{id}/sessions")
    public GroupDto.GroupSessionsDashboard memberSessions(@AuthenticationPrincipal User user,
                                                          @PathVariable UUID id,
                                                          @RequestParam(required = false) UUID memberId,
                                                          @RequestParam(required = false) UUID subjectId,
                                                          @RequestParam(required = false) OffsetDateTime start,
                                                          @RequestParam(required = false) OffsetDateTime end) {
        return groupService.listMemberSessions(user.getId(), id, memberId, subjectId, start, end);
    }

    private String extensionFrom(String originalFilename, String contentType) {
        if (originalFilename != null) {
            String clean = Path.of(originalFilename).getFileName().toString();
            int dot = clean.lastIndexOf('.');
            if (dot >= 0 && dot < clean.length() - 1) {
                String ext = clean.substring(dot).toLowerCase();
                if (ext.matches("\\.(png|jpg|jpeg|webp|gif)")) return ext;
            }
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".jpg";
        };
    }
}
