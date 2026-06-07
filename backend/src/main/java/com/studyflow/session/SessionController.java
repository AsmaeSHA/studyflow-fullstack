package com.studyflow.session;

import com.studyflow.auth.model.User;
import com.studyflow.session.dto.GeneratePlanRequest;
import com.studyflow.session.dto.SessionDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * REST API pour les sessions d'etude :
 *   - CRUD classique
 *   - Actions metier (start, complete, reschedule, cancel)
 *   - Generation de plan automatique via SchedulerService
 */
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final SchedulerService schedulerService;

    // -------- LECTURE --------

    @GetMapping
    public List<SessionDto.Response> list(@AuthenticationPrincipal User user,
                                          @RequestParam(required = false)
                                          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
                                          @RequestParam(required = false)
                                          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        if (from != null && to != null) {
            return sessionService.listInRange(user.getId(), from, to);
        }
        return sessionService.listForUser(user.getId());
    }

    @GetMapping("/{id}")
    public SessionDto.Response getOne(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return sessionService.getOne(user.getId(), id);
    }

    // -------- ECRITURE --------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionDto.Response create(@AuthenticationPrincipal User user,
                                      @Valid @RequestBody SessionDto.CreateOrUpdate body) {
        return sessionService.create(user.getId(), body);
    }

    @PutMapping("/{id}")
    public SessionDto.Response update(@AuthenticationPrincipal User user,
                                      @PathVariable UUID id,
                                      @Valid @RequestBody SessionDto.CreateOrUpdate body) {
        return sessionService.update(user.getId(), id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        sessionService.delete(user.getId(), id);
    }

    // -------- ACTIONS METIER --------

    @PostMapping("/{id}/start")
    public SessionDto.Response start(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return sessionService.start(user.getId(), id);
    }

    @PostMapping("/{id}/complete")
    public SessionDto.Response complete(@AuthenticationPrincipal User user,
                                        @PathVariable UUID id,
                                        @RequestBody(required = false) SessionDto.Complete body) {
        return sessionService.markAsCompleted(user.getId(), id, body);
    }

    @PostMapping("/{id}/reschedule")
    public SessionDto.Response reschedule(@AuthenticationPrincipal User user,
                                          @PathVariable UUID id,
                                          @Valid @RequestBody SessionDto.Reschedule body) {
        return sessionService.reschedule(user.getId(), id, body.newStartDateTime());
    }

    @PostMapping("/{id}/cancel")
    public SessionDto.Response cancel(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return sessionService.cancel(user.getId(), id);
    }

    // -------- SCHEDULER --------

    /**
     * Genere automatiquement un plan d'etude pour la semaine donnee.
     *   POST /api/sessions/generate-plan
     */
    @PostMapping("/generate-plan")
    @ResponseStatus(HttpStatus.CREATED)
    public List<SessionDto.Response> generatePlan(@AuthenticationPrincipal User user,
                                                  @Valid @RequestBody GeneratePlanRequest req) {
        return schedulerService.generatePlan(user.getId(), req);
    }
}
