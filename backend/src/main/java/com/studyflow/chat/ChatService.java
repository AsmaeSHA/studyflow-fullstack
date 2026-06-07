package com.studyflow.chat;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.exception.UnauthorizedException;
import com.studyflow.group.GroupMembershipRepository;
import com.studyflow.group.GroupRealtimeEvent;
import com.studyflow.group.GroupRepository;
import com.studyflow.group.SharedSessionRepository;
import com.studyflow.notification.NotificationService;
import com.studyflow.notification.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final CommentRepository commentRepository;
    private final GroupMembershipRepository membershipRepository;
    private final GroupRepository groupRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final SharedSessionRepository sharedSessionRepository;
    private final SimpMessagingTemplate broker;

    // --- Messages ---

    @Transactional
    public ChatMessageDto.Response send(UUID userId, String roomId, ChatMessageDto.Send body) {
        ChatRoom room = loadRoom(roomId);
        ensureMemberOfGroup(userId, UUID.fromString(room.getGroupId()));
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        ChatMessage msg = ChatMessage.builder()
                .roomId(roomId)
                .senderId(userId.toString())
                .senderName(sender.getFullName())
                .content(body.content().trim())
                .sentAt(Instant.now())
                .edited(false)
                .deleted(false)
                .build();
        msg = messageRepository.save(msg);

        // Notifier les autres membres
        UUID groupId = UUID.fromString(room.getGroupId());
        notifyOtherMembers(userId, groupId,
                sender.getFullName() + " a envoye un message dans le groupe '" + groupName(groupId) + "'",
                Map.of(
                        "roomId", roomId,
                        "messageId", msg.getId(),
                        "groupId", groupId.toString(),
                        "groupName", groupName(groupId),
                        "senderId", userId.toString(),
                        "senderName", sender.getFullName(),
                        "type", "CHAT_MESSAGE",
                        "dedupeKey", "chat-message:" + msg.getId()
                ));

        return toResponse(msg);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto.Response> getHistory(UUID userId, String roomId, int page, int size) {
        ChatRoom room = loadRoom(roomId);
        ensureMemberOfGroup(userId, UUID.fromString(room.getGroupId()));

        Page<ChatMessage> messages = messageRepository.findByRoomIdOrderBySentAtDesc(
                roomId, PageRequest.of(page, Math.min(size, 100)));
        return messages.getContent().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ChatMessageDto.RoomResponse getRoomForGroup(UUID userId, UUID groupId) {
        ensureMemberOfGroup(userId, groupId);
        ChatRoom room = roomRepository.findByGroupId(groupId.toString())
                .orElseGet(() -> roomRepository.save(ChatRoom.builder()
                        .groupId(groupId.toString())
                        .createdAt(Instant.now())
                        .active(true)
                        .build()));
        return ChatMessageDto.RoomResponse.from(room);
    }

    @Transactional
    public ChatMessageDto.Response edit(UUID userId, String messageId, ChatMessageDto.Edit body) {
        ChatMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChatMessage", messageId));
        if (!msg.getSenderId().equals(userId.toString())) {
            throw new UnauthorizedException("Seul l'auteur peut editer son message");
        }
        if (msg.isDeleted()) {
            throw new IllegalStateException("Message supprime");
        }
        msg.setContent(body.content().trim());
        msg.setEdited(true);
        msg.setEditedAt(Instant.now());
        return toResponse(messageRepository.save(msg));
    }

    @Transactional
    public void delete(UUID userId, String messageId) {
        ChatMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChatMessage", messageId));
        if (!msg.getSenderId().equals(userId.toString())) {
            throw new UnauthorizedException("Seul l'auteur peut supprimer son message");
        }
        msg.setDeleted(true);
        msg.setContent("");
        messageRepository.save(msg);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId, String roomId, Instant sinceTimestamp) {
        ChatRoom room = loadRoom(roomId);
        ensureMemberOfGroup(userId, UUID.fromString(room.getGroupId()));
        return messageRepository.countByRoomIdAndSentAtAfter(roomId, sinceTimestamp);
    }

    // --- Comments sur sessions ---

    @Transactional
    public ChatMessageDto.CommentResponse addComment(UUID userId, String sessionId, ChatMessageDto.CreateComment body) {
        ensureCanAccessSharedSession(userId, sessionId);
        Comment c = Comment.builder()
                .sessionId(sessionId)
                .authorId(userId.toString())
                .content(body.content().trim())
                .createdAt(Instant.now())
                .edited(false)
                .build();
        Comment saved = commentRepository.save(c);
        ChatMessageDto.CommentResponse response = toCommentResponse(saved);
        notifyComment(userId, sessionId, saved.getId(), response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto.CommentResponse> listComments(UUID userId, String sessionId) {
        ensureCanAccessSharedSession(userId, sessionId);
        return commentRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream().map(this::toCommentResponse).toList();
    }

    @Transactional
    public void deleteComment(UUID userId, String commentId) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Comment", commentId));
        if (!c.getAuthorId().equals(userId.toString())) {
            throw new UnauthorizedException("Seul l'auteur peut supprimer son commentaire");
        }
        commentRepository.delete(c);
    }

    // --- Helpers ---

    private ChatRoom loadRoom(String roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChatRoom", roomId));
    }

    private void ensureMemberOfGroup(UUID userId, UUID groupId) {
        if (!membershipRepository.existsByGroupIdAndUserIdAndActiveTrue(groupId, userId)) {
            throw new UnauthorizedException("Vous n'etes pas membre du groupe associe");
        }
    }

    private void ensureCanAccessSharedSession(UUID userId, String sessionId) {
        UUID parsedSessionId = UUID.fromString(sessionId);
        boolean allowed = sharedSessionRepository.findBySessionId(parsedSessionId).stream()
                .anyMatch(shared -> membershipRepository.existsByGroupIdAndUserIdAndActiveTrue(
                        shared.getGroup().getId(), userId));
        if (!allowed) {
            throw new UnauthorizedException("Vous devez etre membre du groupe pour acceder aux commentaires");
        }
    }

    private void notifyOtherMembers(UUID senderId, UUID groupId, String message, Map<String, String> meta) {
        membershipRepository.findByGroupIdAndActiveTrue(groupId).stream()
                .filter(m -> m.isActive() && !m.getUser().getId().equals(senderId))
                .forEach(m -> notificationService.notifyUser(
                        m.getUser().getId(),
                        NotificationType.NEW_MESSAGE,
                        message,
                        Map.copyOf(meta)
                ));
    }

    private ChatMessageDto.Response toResponse(ChatMessage message) {
        String senderName = message.getSenderName();
        if (senderName == null || senderName.isBlank()) {
            senderName = userRepository.findById(UUID.fromString(message.getSenderId()))
                    .map(User::getFullName)
                    .orElse("Utilisateur");
        }
        return ChatMessageDto.Response.from(message, senderName);
    }

    private ChatMessageDto.CommentResponse toCommentResponse(Comment comment) {
        String authorName = userRepository.findById(UUID.fromString(comment.getAuthorId()))
                .map(User::getFullName)
                .orElse("Utilisateur");
        return ChatMessageDto.CommentResponse.from(comment, authorName);
    }

    private void notifyComment(UUID authorId,
                               String sessionId,
                               String commentId,
                               ChatMessageDto.CommentResponse response) {
        UUID parsedSessionId = UUID.fromString(sessionId);
        sharedSessionRepository.findBySessionId(parsedSessionId).forEach(shared -> {
            UUID groupId = shared.getGroup().getId();
            GroupRealtimeEvent event = GroupRealtimeEvent.of(
                    "SHARED_SESSION_COMMENT_ADDED",
                    groupId.toString(),
                    authorId.toString(),
                    shared.getId().toString(),
                    sessionId,
                    response,
                    Map.of("commentId", commentId)
            );
            broker.convertAndSend("/topic/groups/" + groupId, event);
            broker.convertAndSend("/topic/groups/" + groupId + "/comments", event);
            membershipRepository.findByGroupIdAndActiveTrue(groupId).stream()
                    .filter(m -> !m.getUser().getId().equals(authorId))
                    .forEach(m -> notificationService.notifyUser(
                            m.getUser().getId(),
                            NotificationType.NEW_MESSAGE,
                            commenterName(authorId) + " a commente la session '" + shared.getSession().getTitle() + "' dans le groupe '" + shared.getGroup().getName() + "'",
                            Map.of(
                                    "groupId", groupId.toString(),
                                    "groupName", shared.getGroup().getName(),
                                    "sessionId", sessionId,
                                    "sessionTitle", shared.getSession().getTitle(),
                                    "commentId", commentId,
                                    "senderId", authorId.toString(),
                                    "senderName", commenterName(authorId),
                                    "type", "SESSION_COMMENT",
                                    "dedupeKey", "session-comment:" + commentId + ":" + m.getUser().getId()
                            )
                    ));
        });
    }

    private String groupName(UUID groupId) {
        return groupRepository.findById(groupId)
                .map(g -> g.getName())
                .orElse("Groupe");
    }

    private String commenterName(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Utilisateur");
    }
}
