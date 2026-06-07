-- =====================================================================
-- StudyFlow - Données de test (Supabase)
-- À exécuter APRÈS V1__init_schema.sql
-- Mots de passe : "Password123!" hashé en BCrypt (cost 10)
--   $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- =====================================================================

-- Utilisateurs de démonstration
INSERT INTO users (id, email, first_name, last_name, password, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@studyflow.io',  'Admin',  'StudyFlow', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN'),
    ('22222222-2222-2222-2222-222222222222', 'asmae@studyflow.io',  'Asmae',  'El Hassani', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'USER'),
    ('33333333-3333-3333-3333-333333333333', 'youssef@studyflow.io','Youssef','Benali',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'USER')
ON CONFLICT (email) DO NOTHING;

-- Matières (Asmae)
INSERT INTO subjects (id, user_id, name, color, priority, weekly_goal_hours, description) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Mathématiques',     '#E63946', 5, 10, 'Algèbre linéaire et analyse'),
    ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Programmation Java','#457B9D', 4,  8, 'Spring Boot, JPA, Java 17'),
    ('aaaa3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Anglais',           '#A8DADC', 2,  3, 'TOEIC preparation')
ON CONFLICT DO NOTHING;

-- Disponibilités (Asmae) - lundi à vendredi
INSERT INTO availabilities (user_id, day_of_week, start_time, end_time, is_recurring) VALUES
    ('22222222-2222-2222-2222-222222222222', 1, '18:00', '20:00', TRUE),
    ('22222222-2222-2222-2222-222222222222', 2, '18:00', '20:00', TRUE),
    ('22222222-2222-2222-2222-222222222222', 3, '18:00', '20:00', TRUE),
    ('22222222-2222-2222-2222-222222222222', 4, '18:00', '20:00', TRUE),
    ('22222222-2222-2222-2222-222222222222', 6, '09:00', '12:00', TRUE)
ON CONFLICT DO NOTHING;

-- Objectif hebdomadaire courant (semaine en cours)
INSERT INTO weekly_goals (user_id, subject_id, week_start, week_end, target_hours, achieved_hours, is_achieved) VALUES
    ('22222222-2222-2222-2222-222222222222', 'aaaa1111-1111-1111-1111-111111111111',
     date_trunc('week', CURRENT_DATE)::date,
     (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,
     10, 4, FALSE)
ON CONFLICT DO NOTHING;

-- Session d'étude exemple
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, notes) VALUES
    ('22222222-2222-2222-2222-222222222222', 'aaaa2222-2222-2222-2222-222222222222',
     'Révision Spring Security',
     now() + INTERVAL '1 day',
     now() + INTERVAL '1 day' + INTERVAL '90 minutes',
     'PLANNED', 90,
     'Focus JWT + Filters');

-- Groupe d'étude exemple
INSERT INTO study_groups (id, created_by, name, description, is_private, max_members) VALUES
    ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     'Java Spring Boot 2026',
     'Groupe d''entraide pour apprendre Spring Boot',
     FALSE, 15)
ON CONFLICT DO NOTHING;

-- Owner = membre OWNER
INSERT INTO group_memberships (group_id, user_id, role) VALUES
    ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'OWNER'),
    ('bbbb1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'MEMBER')
ON CONFLICT DO NOTHING;
