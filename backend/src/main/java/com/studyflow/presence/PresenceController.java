package com.studyflow.presence;

import com.studyflow.auth.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups/{groupId}/presence")
@RequiredArgsConstructor
class PresenceRestController {

    private final PresenceService presenceService;

    @GetMapping
    public PresenceDto.Summary list(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
        return presenceService.list(user.getId(), groupId);
    }

    @PostMapping("/online")
    public PresenceDto.Response online(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
        return presenceService.mark(user.getId(), groupId, PresenceStatus.ONLINE);
    }

    @PostMapping("/offline")
    public PresenceDto.Response offline(@AuthenticationPrincipal User user, @PathVariable UUID groupId) {
        return presenceService.mark(user.getId(), groupId, PresenceStatus.OFFLINE);
    }
}

@Controller
@RequiredArgsConstructor
class PresenceWebSocketController {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate broker;

    @MessageMapping("/presence.join/{groupId}")
    public void join(@DestinationVariable UUID groupId, Principal principal) {
        publish(groupId, principal, PresenceStatus.ONLINE);
    }

    @MessageMapping("/presence.leave/{groupId}")
    public void leave(@DestinationVariable UUID groupId, Principal principal) {
        publish(groupId, principal, PresenceStatus.OFFLINE);
    }

    private void publish(UUID groupId, Principal principal, PresenceStatus status) {
        if (principal == null || !(principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken token)) {
            return;
        }
        Object principalUser = token.getPrincipal();
        if (!(principalUser instanceof User user)) {
            return;
        }
        PresenceDto.Response response = presenceService.mark(user.getId(), groupId, status);
        broker.convertAndSend("/topic/groups/" + groupId + "/presence", response);
    }
}
