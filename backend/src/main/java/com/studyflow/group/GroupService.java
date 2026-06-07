package com.studyflow.group;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.chat.ChatRoom;
import com.studyflow.chat.ChatRoomRepository;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.exception.UnauthorizedException;
import com.studyflow.notification.NotificationService;
import com.studyflow.notification.NotificationType;
import com.studyflow.session.SessionStatus;
import com.studyflow.session.SessionRepository;
import com.studyflow.session.StudySession;
import com.studyflow.session.dto.SessionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service de gestion des groupes d'etude :
 *   - CRUD groupe (avec creation auto de la salle de chat MongoDB)
 *   - Adhesion / sortie / promotion / retrait de membres
 *   - Invitations (envoi, accept, decline)
 *   - Partage de sessions
 */
@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMembershipRepository membershipRepository;
    private final GroupInvitationRepository invitationRepository;
    private final SharedSessionRepository sharedSessionRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate broker;

    // ---------------------- GROUPES ----------------------

    @Transactional(readOnly = true)
    public List<GroupDto.Response> listForUser(UUID userId) {
        return groupRepository.findGroupsForMember(userId)
                .stream().map(GroupDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public List<GroupDto.Response> listPublic() {
        return groupRepository.findPublicGroups()
                .stream().map(GroupDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public GroupDto.Response getOne(UUID userId, UUID groupId) {
        StudyGroup g = loadGroup(groupId);
        ensureMember(userId, groupId);
        return GroupDto.Response.from(g);
    }

    @Transactional
    public GroupDto.Response create(UUID ownerId, GroupDto.CreateOrUpdate body) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", ownerId));

        StudyGroup group = StudyGroup.builder()
                .owner(owner)
                .name(body.name())
                .description(body.description())
                .privateGroup(body.privateGroup() != null ? body.privateGroup() : false)
                .maxMembers(body.maxMembers() != null ? body.maxMembers() : 10)
                .build();
        group.setImageUrl(body.imageUrl());

        group = groupRepository.save(group);

        // Cree la salle de chat Mongo (retrouvee plus tard via ChatRoomRepository.findByGroupId)
        ChatRoom room = ChatRoom.builder()
                .groupId(group.getId().toString())
                .createdAt(Instant.now())
                .active(true)
                .build();
        chatRoomRepository.save(room);

        // L'owner devient membre OWNER
        GroupMembership membership = GroupMembership.builder()
                .group(group)
                .user(owner)
                .role(MemberRole.OWNER)
                .active(true)
                .build();
        membership = membershipRepository.save(membership);
        group.getMemberships().add(membership);

        publishGroupUpdated(group, ownerId);
        return GroupDto.Response.from(group);
    }

    @Transactional
    public GroupDto.Response update(UUID userId, UUID groupId, GroupDto.CreateOrUpdate body) {
        StudyGroup g = loadGroup(groupId);
        ensureOwnerOrModerator(userId, groupId);
        g.setName(body.name());
        g.setDescription(body.description());
        if (body.privateGroup() != null) g.setPrivateGroup(body.privateGroup());
        if (body.maxMembers() != null)   g.setMaxMembers(body.maxMembers());
        if (body.imageUrl() != null)     g.setImageUrl(body.imageUrl());
        g = groupRepository.save(g);
        publishGroupUpdated(g, userId);
        return GroupDto.Response.from(g);
    }

    @Transactional
    public void delete(UUID userId, UUID groupId) {
        StudyGroup g = loadGroup(groupId);
        if (!g.getOwner().getId().equals(userId)) {
            throw new UnauthorizedException("Seul le proprietaire peut supprimer le groupe");
        }
        publishGroupUpdated(g, userId);
        groupRepository.delete(g);
    }

    // ---------------------- MEMBRES ----------------------

    @Transactional(readOnly = true)
    public List<GroupDto.MemberResponse> listMembers(UUID userId, UUID groupId) {
        ensureMember(userId, groupId);
        return loadGroup(groupId).getMemberships().stream()
                .filter(GroupMembership::isActive)
                .map(GroupDto.MemberResponse::from)
                .toList();
    }

    @Transactional
    public void leave(UUID userId, UUID groupId) {
        GroupMembership m = membershipRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new IllegalStateException("Vous n'etes pas membre"));
        membershipRepository.delete(m);
    }

    @Transactional
    public void removeMember(UUID actorId, UUID groupId, UUID memberUserId) {
        ensureOwnerOrModerator(actorId, groupId);
        GroupMembership m = membershipRepository.findByGroupIdAndUserId(groupId, memberUserId)
                .orElseThrow(() -> ResourceNotFoundException.of("Membership", memberUserId));
        if (m.getRole() == MemberRole.OWNER) {
            throw new IllegalStateException("Impossible d'expulser le proprietaire");
        }
        membershipRepository.delete(m);
    }

    @Transactional
    public void changeRole(UUID actorId, UUID groupId, UUID memberUserId, MemberRole newRole) {
        StudyGroup g = loadGroup(groupId);
        if (!g.getOwner().getId().equals(actorId)) {
            throw new UnauthorizedException("Seul le proprietaire peut changer les roles");
        }
        if (newRole == MemberRole.OWNER) {
            throw new IllegalArgumentException("Utilisez le transfert de propriete pour ce role");
        }
        GroupMembership m = membershipRepository.findByGroupIdAndUserId(groupId, memberUserId)
                .orElseThrow(() -> ResourceNotFoundException.of("Membership", memberUserId));
        m.setRole(newRole);
        membershipRepository.save(m);
    }

    // ---------------------- INVITATIONS ----------------------

    @Transactional
    public InvitationDto.Response invite(UUID senderId, UUID groupId, InvitationDto.Create body) {
        StudyGroup g = loadGroup(groupId);
        ensureOwnerOrModerator(senderId, groupId);

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", senderId));
        User recipient = userRepository.findByEmail(body.recipientEmail().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Aucun utilisateur trouve avec cet email"));

        if (recipient.getId().equals(senderId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas vous inviter vous-meme");
        }
        if (membershipRepository.existsByGroupIdAndUserIdAndActiveTrue(groupId, recipient.getId())) {
            throw new IllegalStateException("Cet utilisateur est deja membre");
        }
        if (invitationRepository.existsByGroupIdAndRecipientIdAndStatus(groupId, recipient.getId(), InvitationStatus.PENDING)) {
            throw new IllegalStateException("Une invitation est deja en attente pour cet utilisateur");
        }
        if (membershipRepository.countByGroupIdAndActiveTrue(groupId) >= g.getMaxMembers()) {
            throw new IllegalStateException("Le groupe est complet");
        }

        GroupInvitation inv = GroupInvitation.builder()
                .group(g)
                .sender(sender)
                .recipient(recipient)
                .message(body.message())
                .status(InvitationStatus.PENDING)
                .build();
        inv = invitationRepository.save(inv);

        notificationService.notifyUser(
                recipient.getId(),
                NotificationType.GROUP_INVITATION,
                "Vous avez ete invite a rejoindre le groupe '" + g.getName() + "'",
                Map.of(
                        "invitationId", inv.getId().toString(),
                        "groupId", g.getId().toString(),
                        "groupName", g.getName(),
                        "senderId", sender.getId().toString(),
                        "senderName", sender.getFullName(),
                        "type", "GROUP_INVITATION",
                        "dedupeKey", "group-invitation:" + inv.getId()
                )
        );

        return InvitationDto.Response.from(inv);
    }

    @Transactional(readOnly = true)
    public List<InvitationDto.Response> listMyPendingInvitations(UUID userId) {
        return invitationRepository.findByRecipientIdAndStatusOrderBySentAtDesc(userId, InvitationStatus.PENDING)
                .stream().map(InvitationDto.Response::from).toList();
    }

    @Transactional
    public InvitationDto.Response respondInvitation(UUID userId, UUID invitationId, boolean accept) {
        GroupInvitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> ResourceNotFoundException.of("Invitation", invitationId));

        if (!inv.getRecipient().getId().equals(userId)) {
            throw new UnauthorizedException("Cette invitation ne vous est pas adressee");
        }
        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalStateException("Cette invitation n'est plus en attente");
        }
        if (inv.isExpired()) {
            inv.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(inv);
            throw new IllegalStateException("Invitation expiree");
        }

        if (accept) {
            inv.accept();
            // Ajouter le membre
            GroupMembership existing = membershipRepository
                    .findByGroupIdAndUserId(inv.getGroup().getId(), userId)
                    .orElse(null);
            if (existing != null) {
                existing.setActive(true);
                membershipRepository.save(existing);
            } else {
                membershipRepository.save(GroupMembership.builder()
                        .group(inv.getGroup())
                        .user(inv.getRecipient())
                        .role(MemberRole.MEMBER)
                        .active(true)
                        .build());
            }
            for (GroupMembership m : inv.getGroup().getMemberships()) {
                if (m.isActive() && !m.getUser().getId().equals(userId)) {
                    notificationService.notifyUser(
                            m.getUser().getId(),
                            NotificationType.GROUP_JOINED,
                            inv.getRecipient().getFullName() + " a rejoint " + inv.getGroup().getName(),
                            Map.of("groupId", inv.getGroup().getId().toString(), "userId", userId.toString())
                    );
                }
            }
            if (!inv.getSender().getId().equals(userId)) {
                notificationService.notifyUser(
                        inv.getSender().getId(),
                        NotificationType.GROUP_INVITATION,
                        inv.getRecipient().getFullName() + " a accepte votre invitation a rejoindre " + inv.getGroup().getName(),
                        Map.of(
                                "invitationId", inv.getId().toString(),
                                "groupId", inv.getGroup().getId().toString(),
                                "groupName", inv.getGroup().getName(),
                                "senderId", userId.toString(),
                                "senderName", inv.getRecipient().getFullName(),
                                "type", "GROUP_INVITATION_ACCEPTED",
                                "dedupeKey", "invitation-accepted:" + inv.getId()
                        )
                );
            }
        } else {
            inv.decline();
            if (!inv.getSender().getId().equals(userId)) {
                notificationService.notifyUser(
                        inv.getSender().getId(),
                        NotificationType.GROUP_INVITATION,
                        inv.getRecipient().getFullName() + " a refuse votre invitation a rejoindre " + inv.getGroup().getName(),
                        Map.of(
                                "invitationId", inv.getId().toString(),
                                "groupId", inv.getGroup().getId().toString(),
                                "groupName", inv.getGroup().getName(),
                                "senderId", userId.toString(),
                                "senderName", inv.getRecipient().getFullName(),
                                "type", "GROUP_INVITATION_DECLINED",
                                "dedupeKey", "invitation-declined:" + inv.getId()
                        )
                );
            }
        }
        invitationRepository.save(inv);
        return InvitationDto.Response.from(inv);
    }

    // ---------------------- PARTAGE DE SESSIONS ----------------------

    @Transactional
    public GroupDto.SharedSessionResponse shareSession(UUID userId, UUID groupId, GroupDto.ShareSessionRequest body) {
        ensureMember(userId, groupId);
        StudyGroup g = loadGroup(groupId);

        UUID sessionId = UUID.fromString(body.sessionId());
        StudySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of("StudySession", sessionId));
        if (!session.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Vous ne pouvez partager que vos propres sessions");
        }
        ensureShareableSession(session);
        SharedSession existing = sharedSessionRepository.findByGroupIdAndSessionId(groupId, sessionId).orElse(null);
        if (existing != null) {
            return sharedSessionResponse(existing, userId);
        }

        session.setShared(true);
        sessionRepository.save(session);

        SharedSession shared = SharedSession.builder()
                .session(session)
                .group(g)
                .sharedBy(session.getUser())
                .message(body.message())
                .build();
        shared = sharedSessionRepository.save(shared);
        GroupDto.SharedSessionResponse response = sharedSessionResponse(shared, userId);

        // Notifier les membres
        for (GroupMembership m : g.getMemberships()) {
            if (m.isActive() && !m.getUser().getId().equals(userId)) {
                notificationService.notifyUser(
                        m.getUser().getId(),
                        NotificationType.SESSION_SHARED,
                        session.getUser().getFullName() + " a partage la session \"" + session.getTitle() + "\" dans " + g.getName(),
                        Map.of(
                                "groupId", g.getId().toString(),
                                "groupName", g.getName(),
                                "sessionId", session.getId().toString(),
                                "sharedSessionId", shared.getId().toString(),
                                "senderId", userId.toString(),
                                "senderName", session.getUser().getFullName(),
                                "type", "SESSION_SHARED",
                                "dedupeKey", "session-shared:" + shared.getId() + ":" + m.getUser().getId()
                        )
                );
            }
        }
        publishGroupEvent("SHARED_SESSION_CREATED", g.getId(), userId, shared, response, Map.of());
        return response;
    }

    @Transactional(readOnly = true)
    public List<GroupDto.SharedSessionResponse> listSharedSessions(UUID userId, UUID groupId) {
        ensureMember(userId, groupId);
        return sharedSessionRepository.findByGroupIdOrderBySharedAtDesc(groupId)
                .stream().map(shared -> sharedSessionResponse(shared, userId)).toList();
    }

    @Transactional(readOnly = true)
    public List<SessionDto.Response> listShareableSessions(UUID userId, UUID groupId) {
        ensureMember(userId, groupId);
        OffsetDateTime now = OffsetDateTime.now();
        return sessionRepository.findByUserIdAndStatusOrderByStartDateTimeAsc(userId, SessionStatus.PLANNED)
                .stream()
                .filter(session -> session.getStartDateTime().isAfter(now))
                .filter(session -> session.getEndDateTime().isAfter(now))
                .filter(session -> sharedSessionRepository.findByGroupIdAndSessionId(groupId, session.getId()).isEmpty())
                .map(SessionDto.Response::from)
                .toList();
    }

    @Transactional
    public GroupDto.SharedSessionDecisionResponse acceptSharedSession(UUID userId, UUID groupId, UUID sharedSessionId) {
        ensureMember(userId, groupId);
        SharedSession shared = loadSharedSession(groupId, sharedSessionId);
        StudySession source = shared.getSession();
        ensureAcceptableSharedSession(source);

        if (source.getUser().getId().equals(userId)) {
            GroupDto.SharedSessionResponse response = sharedSessionResponse(shared, userId);
            return GroupDto.SharedSessionDecisionResponse.builder()
                    .sharedSession(response)
                    .decision("ACCEPTED")
                    .personalSessionId(source.getId())
                    .message("Vous etes deja l'auteur de cette session.")
                    .build();
        }

        ensureNoSessionOverlap(userId, source.getStartDateTime(), source.getEndDateTime());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        StudySession personal = StudySession.builder()
                .user(user)
                .subject(source.getSubject())
                .title(source.getTitle())
                .startDateTime(source.getStartDateTime())
                .endDateTime(source.getEndDateTime())
                .status(SessionStatus.PLANNED)
                .shared(false)
                .plannedDuration(source.getPlannedDuration())
                .notes(source.getNotes())
                .build();
        personal = sessionRepository.save(personal);

        GroupDto.SharedSessionResponse response = sharedSessionResponse(shared, userId);
        publishGroupEvent("SHARED_SESSION_ACCEPTED", groupId, userId, shared, response,
                Map.of("personalSessionId", personal.getId().toString()));
        notifySharedSessionOwner(shared, userId, "a accepte votre session partagee", "shared-session-accepted");

        return GroupDto.SharedSessionDecisionResponse.builder()
                .sharedSession(response)
                .decision("ACCEPTED")
                .personalSessionId(personal.getId())
                .message("Session ajoutee a vos sessions.")
                .build();
    }

    @Transactional(readOnly = true)
    public GroupDto.SharedSessionDecisionResponse declineSharedSession(UUID userId, UUID groupId, UUID sharedSessionId) {
        ensureMember(userId, groupId);
        SharedSession shared = loadSharedSession(groupId, sharedSessionId);
        GroupDto.SharedSessionResponse response = sharedSessionResponse(shared, userId);
        publishGroupEvent("SHARED_SESSION_DECLINED", groupId, userId, shared, response, Map.of());
        notifySharedSessionOwner(shared, userId, "a refuse votre session partagee", "shared-session-declined");
        return GroupDto.SharedSessionDecisionResponse.builder()
                .sharedSession(response)
                .decision("DECLINED")
                .message("Session refusee pour cet appareil.")
                .build();
    }

    @Transactional(readOnly = true)
    public GroupDto.GroupSessionsDashboard listMemberSessions(UUID userId,
                                                              UUID groupId,
                                                              UUID memberId,
                                                              UUID subjectId,
                                                              OffsetDateTime start,
                                                              OffsetDateTime end) {
        ensureMember(userId, groupId);
        List<UUID> memberIds = membershipRepository.findByGroupIdAndActiveTrue(groupId).stream()
                .map(m -> m.getUser().getId())
                .toList();
        if (memberIds.isEmpty()) {
            return GroupDto.GroupSessionsDashboard.builder()
                    .sessions(List.of())
                    .stats(emptyStats())
                    .build();
        }
        if (memberId != null && !memberIds.contains(memberId)) {
            throw new UnauthorizedException("Ce membre n'appartient pas au groupe");
        }

        List<StudySession> sessions = sessionRepository.findGroupSessions(memberIds, memberId, subjectId, start, end);
        return GroupDto.GroupSessionsDashboard.builder()
                .sessions(sessions.stream().map(GroupDto.GroupSessionResponse::from).toList())
                .stats(buildStats(sessions))
                .build();
    }

    // ---------------------- HELPERS ----------------------

    private StudyGroup loadGroup(UUID groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> ResourceNotFoundException.of("StudyGroup", groupId));
    }

    private SharedSession loadSharedSession(UUID groupId, UUID sharedSessionId) {
        SharedSession shared = sharedSessionRepository.findById(sharedSessionId)
                .orElseThrow(() -> ResourceNotFoundException.of("SharedSession", sharedSessionId));
        if (!shared.getGroup().getId().equals(groupId)) {
            throw new UnauthorizedException("Cette session partagee n'appartient pas a ce groupe");
        }
        return shared;
    }

    private void ensureShareableSession(StudySession session) {
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new IllegalStateException("Impossible de partager une session terminee");
        }
        if (session.getStatus() == SessionStatus.CANCELLED) {
            throw new IllegalStateException("Impossible de partager une session annulee");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (session.getStatus() != SessionStatus.PLANNED
                || !session.getStartDateTime().isAfter(now)
                || !session.getEndDateTime().isAfter(now)) {
            throw new IllegalStateException("Impossible de partager une session expiree ou deja commencee");
        }
    }

    private void ensureAcceptableSharedSession(StudySession session) {
        if (session.getStatus() == SessionStatus.COMPLETED || session.getStatus() == SessionStatus.CANCELLED) {
            throw new IllegalStateException("Cette session partagee n'est plus disponible");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (!session.getStartDateTime().isAfter(now) || !session.getEndDateTime().isAfter(now)) {
            throw new IllegalStateException("Cette session partagee est expiree et ne peut plus etre acceptee");
        }
    }

    private GroupDto.SharedSessionResponse sharedSessionResponse(SharedSession shared, UUID currentUserId) {
        boolean sharedByCurrentUser = shared.getSharedBy() != null && shared.getSharedBy().getId().equals(currentUserId);
        return GroupDto.SharedSessionResponse.from(shared, sharedByCurrentUser);
    }

    private void ensureNoSessionOverlap(UUID userId, OffsetDateTime start, OffsetDateTime end) {
        boolean hasConflict = sessionRepository.findInRange(userId, start, end).stream()
                .anyMatch(existing -> existing.getStatus() != SessionStatus.CANCELLED);
        if (hasConflict) {
            throw new IllegalStateException(
                    "Impossible d'accepter cette session : vous avez deja une session planifiee sur ce creneau.");
        }
    }

    private void publishGroupEvent(String type,
                                   UUID groupId,
                                   UUID actorId,
                                   SharedSession shared,
                                   Object payload,
                                   Map<String, String> metadata) {
        GroupRealtimeEvent event = GroupRealtimeEvent.of(
                type,
                groupId.toString(),
                actorId.toString(),
                shared.getId().toString(),
                shared.getSession().getId().toString(),
                payload,
                metadata
        );
        broker.convertAndSend("/topic/groups/" + groupId, event);
        broker.convertAndSend("/topic/groups/" + groupId + "/shared-sessions", event);
    }

    private void publishGroupUpdated(StudyGroup group, UUID actorId) {
        broker.convertAndSend("/topic/groups/" + group.getId(),
                GroupRealtimeEvent.of(
                        "GROUP_UPDATED",
                        group.getId().toString(),
                        actorId.toString(),
                        null,
                        null,
                        GroupDto.Response.from(group),
                        Map.of()
                ));
    }

    private void notifySharedSessionOwner(SharedSession shared, UUID actorId, String action, String keyPrefix) {
        if (shared.getSharedBy() == null || shared.getSharedBy().getId().equals(actorId)) {
            return;
        }
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", actorId));
        notificationService.notifyUser(
                shared.getSharedBy().getId(),
                NotificationType.SESSION_SHARED,
                actor.getFullName() + " " + action + " \"" + shared.getSession().getTitle() + "\"",
                Map.of(
                        "groupId", shared.getGroup().getId().toString(),
                        "groupName", shared.getGroup().getName(),
                        "sessionId", shared.getSession().getId().toString(),
                        "sessionTitle", shared.getSession().getTitle(),
                        "sharedSessionId", shared.getId().toString(),
                        "actorId", actorId.toString(),
                        "senderId", actorId.toString(),
                        "senderName", actor.getFullName(),
                        "type", keyPrefix,
                        "dedupeKey", keyPrefix + ":" + shared.getId() + ":" + actorId
                )
        );
    }

    private void ensureMember(UUID userId, UUID groupId) {
        if (!membershipRepository.existsByGroupIdAndUserIdAndActiveTrue(groupId, userId)) {
            throw new UnauthorizedException("Vous n'etes pas membre de ce groupe");
        }
    }

    private void ensureOwnerOrModerator(UUID userId, UUID groupId) {
        GroupMembership m = membershipRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UnauthorizedException("Vous n'etes pas membre de ce groupe"));
        if (m.getRole() != MemberRole.OWNER && m.getRole() != MemberRole.MODERATOR) {
            throw new UnauthorizedException("Reserve aux OWNER / MODERATOR");
        }
    }

    private GroupDto.GroupSessionStats emptyStats() {
        return GroupDto.GroupSessionStats.builder()
                .totalSessions(0)
                .completedSessions(0)
                .plannedSessions(0)
                .totalPlannedMinutes(0)
                .totalActualMinutes(0)
                .sessionsBySubject(Map.of())
                .minutesByMember(Map.of())
                .build();
    }

    private GroupDto.GroupSessionStats buildStats(List<StudySession> sessions) {
        Map<String, Long> bySubject = sessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getSubject() != null ? s.getSubject().getName() : "Sans matiere",
                        LinkedHashMap::new,
                        Collectors.counting()));
        Map<String, Long> minutesByMember = sessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getUser().getFullName(),
                        LinkedHashMap::new,
                        Collectors.summingLong(StudySession::getDurationMinutes)));
        return GroupDto.GroupSessionStats.builder()
                .totalSessions(sessions.size())
                .completedSessions(sessions.stream().filter(s -> s.getStatus().name().equals("COMPLETED")).count())
                .plannedSessions(sessions.stream().filter(s -> s.getStatus().name().equals("PLANNED")).count())
                .totalPlannedMinutes(sessions.stream().mapToLong(StudySession::getDurationMinutes).sum())
                .totalActualMinutes(sessions.stream().mapToLong(s -> s.getActualDuration() != null ? s.getActualDuration() : 0).sum())
                .sessionsBySubject(bySubject)
                .minutesByMember(minutesByMember)
                .build();
    }
}
