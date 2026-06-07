package com.studyflow.subject;

import com.studyflow.auth.UserRepository;
import com.studyflow.auth.model.User;
import com.studyflow.exception.ResourceNotFoundException;
import com.studyflow.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SubjectDto.Response> listForUser(UUID userId) {
        return subjectRepository.findByUserIdOrderByPriorityDescNameAsc(userId)
                .stream().map(SubjectDto.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public SubjectDto.Response getOne(UUID userId, UUID subjectId) {
        Subject s = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ResourceNotFoundException.of("Subject", subjectId));
        ensureOwner(s, userId);
        return SubjectDto.Response.from(s);
    }

    @Transactional
    public SubjectDto.Response create(UUID userId, SubjectDto.CreateOrUpdate body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        Subject subject = Subject.builder()
                .user(user)
                .name(body.name())
                .color(body.color() != null ? body.color() : "#2E86AB")
                .priority(body.priority() != null ? body.priority() : 3)
                .weeklyGoalHours(body.weeklyGoalHours() != null ? body.weeklyGoalHours() : 0f)
                .maxSessionDuration(body.maxSessionDuration())
                .description(body.description())
                .build();

        return SubjectDto.Response.from(subjectRepository.save(subject));
    }

    @Transactional
    public SubjectDto.Response update(UUID userId, UUID subjectId, SubjectDto.CreateOrUpdate body) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ResourceNotFoundException.of("Subject", subjectId));
        ensureOwner(subject, userId);

        subject.setName(body.name());
        if (body.color() != null) subject.setColor(body.color());
        if (body.priority() != null) subject.setPriority(body.priority());
        if (body.weeklyGoalHours() != null) subject.setWeeklyGoalHours(body.weeklyGoalHours());
        if (body.maxSessionDuration() != null) subject.setMaxSessionDuration(body.maxSessionDuration());
        subject.setDescription(body.description());

        return SubjectDto.Response.from(subjectRepository.save(subject));
    }

    @Transactional
    public void delete(UUID userId, UUID subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ResourceNotFoundException.of("Subject", subjectId));
        ensureOwner(subject, userId);
        subjectRepository.delete(subject);
    }

    private void ensureOwner(Subject s, UUID userId) {
        if (!s.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Cette matière ne vous appartient pas");
        }
    }
}
