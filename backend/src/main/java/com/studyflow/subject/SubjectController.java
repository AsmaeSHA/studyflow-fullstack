package com.studyflow.subject;

import com.studyflow.auth.model.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    public List<SubjectDto.Response> list(@AuthenticationPrincipal User user) {
        return subjectService.listForUser(user.getId());
    }

    @GetMapping("/{id}")
    public SubjectDto.Response getOne(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return subjectService.getOne(user.getId(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubjectDto.Response create(@AuthenticationPrincipal User user,
                                      @Valid @RequestBody SubjectDto.CreateOrUpdate body) {
        return subjectService.create(user.getId(), body);
    }

    @PutMapping("/{id}")
    public SubjectDto.Response update(@AuthenticationPrincipal User user,
                                      @PathVariable UUID id,
                                      @Valid @RequestBody SubjectDto.CreateOrUpdate body) {
        return subjectService.update(user.getId(), id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        subjectService.delete(user.getId(), id);
    }
}
