package com.studyflow.chat;

import com.studyflow.auth.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/groups/{groupId}/room")
    public ChatMessageDto.RoomResponse roomForGroup(@AuthenticationPrincipal User user,
                                                    @PathVariable UUID groupId) {
        return chatService.getRoomForGroup(user.getId(), groupId);
    }

    // --- Messages ---
    @GetMapping("/rooms/{roomId}/messages")
    public List<ChatMessageDto.Response> history(@AuthenticationPrincipal User user,
                                                 @PathVariable String roomId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "50") int size) {
        return chatService.getHistory(user.getId(), roomId, page, size);
    }

    @PostMapping("/rooms/{roomId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto.Response send(@AuthenticationPrincipal User user,
                                        @PathVariable String roomId,
                                        @Valid @RequestBody ChatMessageDto.Send body) {
        return chatService.send(user.getId(), roomId, body);
    }

    @PutMapping("/messages/{messageId}")
    public ChatMessageDto.Response edit(@AuthenticationPrincipal User user,
                                        @PathVariable String messageId,
                                        @Valid @RequestBody ChatMessageDto.Edit body) {
        return chatService.edit(user.getId(), messageId, body);
    }

    @DeleteMapping("/messages/{messageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable String messageId) {
        chatService.delete(user.getId(), messageId);
    }

    @GetMapping("/rooms/{roomId}/unread")
    public Map<String, Long> unread(@AuthenticationPrincipal User user,
                                    @PathVariable String roomId,
                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since) {
        return Map.of("unreadCount", chatService.getUnreadCount(user.getId(), roomId, since));
    }

    // --- Comments sur sessions ---
    @GetMapping("/sessions/{sessionId}/comments")
    public List<ChatMessageDto.CommentResponse> comments(@AuthenticationPrincipal User user,
                                                         @PathVariable String sessionId) {
        return chatService.listComments(user.getId(), sessionId);
    }

    @PostMapping("/sessions/{sessionId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto.CommentResponse addComment(@AuthenticationPrincipal User user,
                                                     @PathVariable String sessionId,
                                                     @Valid @RequestBody ChatMessageDto.CreateComment body) {
        return chatService.addComment(user.getId(), sessionId, body);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@AuthenticationPrincipal User user, @PathVariable String commentId) {
        chatService.deleteComment(user.getId(), commentId);
    }
}
