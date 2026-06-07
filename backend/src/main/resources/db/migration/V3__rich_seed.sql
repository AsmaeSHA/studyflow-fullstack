-- =====================================================================
-- StudyFlow - Seed riche pour tester le dashboard admin
-- Schema attendu : tables Supabase deja creees (users, subjects,
-- study_sessions, study_groups, group_memberships, group_invitations,
-- shared_sessions, weekly_goals, availabilities)
--
-- A executer dans le SQL Editor Supabase une seule fois.
-- Tous les utilisateurs créés ont pour mot de passe : "Password123!"
-- (haché via pgcrypto -> format bcrypt $2a$).
-- =====================================================================

-- Extension pgcrypto (deja active sur Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nettoyer les utilisateurs et toute leur cascade s'ils existaient deja
DELETE FROM shared_sessions    WHERE session_id IN (SELECT id FROM study_sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io'));
DELETE FROM group_invitations  WHERE sender_id    IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io')
                                  OR recipient_id IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM group_memberships  WHERE user_id      IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM study_groups       WHERE created_by   IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM weekly_goals       WHERE user_id      IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM study_sessions     WHERE user_id      IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM availabilities     WHERE user_id      IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM subjects           WHERE user_id      IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM refresh_tokens     WHERE user_id      IN (SELECT id FROM users WHERE email LIKE '%@studyflow.io');
DELETE FROM users              WHERE email LIKE '%@studyflow.io';

-- =====================================================================
-- 1) UTILISATEURS (1 admin + 8 students)
-- =====================================================================
INSERT INTO users (id, email, first_name, last_name, password, role, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@studyflow.io',    'Admin',    'StudyFlow',   crypt('Password123!', gen_salt('bf')), 'ADMIN', now() - INTERVAL '90 days', now()),
    ('22222222-2222-2222-2222-222222222222', 'asmae@studyflow.io',    'Asmae',    'El Hassani',  crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '60 days', now()),
    ('33333333-3333-3333-3333-333333333333', 'youssef@studyflow.io',  'Youssef',  'Benali',      crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '45 days', now()),
    ('44444444-4444-4444-4444-444444444444', 'sara@studyflow.io',     'Sara',     'El Fassi',    crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '30 days', now()),
    ('55555555-5555-5555-5555-555555555555', 'karim@studyflow.io',    'Karim',    'Mouhib',      crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '20 days', now()),
    ('66666666-6666-6666-6666-666666666666', 'lina@studyflow.io',     'Lina',     'Tazi',        crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '15 days', now()),
    ('77777777-7777-7777-7777-777777777777', 'omar@studyflow.io',     'Omar',     'Bouazza',     crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '10 days', now()),
    ('88888888-8888-8888-8888-888888888888', 'fatima@studyflow.io',   'Fatima',   'Idrissi',     crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '7 days',  now()),
    ('99999999-9999-9999-9999-999999999999', 'amine@studyflow.io',    'Amine',    'Berrada',     crypt('Password123!', gen_salt('bf')), 'USER',  now() - INTERVAL '3 days',  now());

-- =====================================================================
-- 2) MATIERES
-- =====================================================================
INSERT INTO subjects (id, user_id, name, color, priority, weekly_goal_hours, description, created_at) VALUES
    -- Asmae : maths, java, anglais, algo
    ('a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Mathématiques',     '#E63946', 5, 10, 'Algèbre linéaire et analyse',       now() - INTERVAL '60 days'),
    ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Programmation Java', '#457B9D', 4,  8, 'Spring Boot, JPA, Java 17',         now() - INTERVAL '60 days'),
    ('a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Anglais',            '#A8DADC', 2,  3, 'TOEIC preparation',                  now() - INTERVAL '55 days'),
    ('a4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Algorithmique',      '#F4A261', 4,  6, 'Structures de données et complexité',now() - INTERVAL '50 days'),
    -- Youssef : web, BDD
    ('b1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Développement Web',  '#2A9D8F', 5,  9, 'Angular, React, REST',              now() - INTERVAL '45 days'),
    ('b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Bases de données',   '#264653', 4,  5, 'SQL, NoSQL, MongoDB',               now() - INTERVAL '40 days'),
    ('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'DevOps',             '#E76F51', 3,  4, 'Docker, CI/CD, Kubernetes',         now() - INTERVAL '35 days'),
    -- Sara : phys, chimie
    ('c1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Physique',           '#9C89B8', 5,  8, 'Mécanique quantique',               now() - INTERVAL '30 days'),
    ('c2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Chimie',             '#F0A6CA', 3,  5, 'Chimie organique',                  now() - INTERVAL '28 days'),
    -- Karim : eco, marketing
    ('d1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Économie',           '#FFB703', 4,  7, 'Macro et microéconomie',            now() - INTERVAL '20 days'),
    ('d2222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Marketing',          '#FB8500', 3,  4, 'Stratégie et digital marketing',    now() - INTERVAL '18 days'),
    -- Lina : design
    ('e1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Design UI/UX',       '#FFC8DD', 4,  6, 'Figma, prototypage',                now() - INTERVAL '15 days'),
    ('e2222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'HTML/CSS',           '#CDB4DB', 3,  4, 'Frontend basics',                   now() - INTERVAL '14 days'),
    -- Omar : data
    ('f1111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Data Science',       '#06A77D', 5,  9, 'Python, pandas, ML',                now() - INTERVAL '10 days'),
    ('f2222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'Statistiques',       '#003049', 4,  5, 'Probabilités et stats',             now() - INTERVAL '9 days'),
    -- Fatima : droit
    ('a5555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'Droit constitutionnel','#8338EC', 4,  6, 'Théorie de l''État',               now() - INTERVAL '7 days'),
    -- Amine : finance
    ('a6666666-6666-6666-6666-666666666666', '99999999-9999-9999-9999-999999999999', 'Finance d''entreprise','#3A86FF', 4,  7, 'Analyse financière',                now() - INTERVAL '3 days');

-- =====================================================================
-- 3) DISPONIBILITES (un peu pour chaque user)
-- =====================================================================
INSERT INTO availabilities (user_id, day_of_week, start_time, end_time, is_recurring) VALUES
    -- Asmae : lundi-vendredi soir + samedi matin
    ('22222222-2222-2222-2222-222222222222', 1, '18:00', '20:30', TRUE),
    ('22222222-2222-2222-2222-222222222222', 2, '18:00', '20:30', TRUE),
    ('22222222-2222-2222-2222-222222222222', 3, '18:00', '20:30', TRUE),
    ('22222222-2222-2222-2222-222222222222', 4, '18:00', '20:30', TRUE),
    ('22222222-2222-2222-2222-222222222222', 6, '09:00', '12:00', TRUE),
    -- Youssef
    ('33333333-3333-3333-3333-333333333333', 2, '19:00', '21:00', TRUE),
    ('33333333-3333-3333-3333-333333333333', 4, '19:00', '21:00', TRUE),
    ('33333333-3333-3333-3333-333333333333', 7, '10:00', '13:00', TRUE),
    -- Sara
    ('44444444-4444-4444-4444-444444444444', 1, '17:00', '19:00', TRUE),
    ('44444444-4444-4444-4444-444444444444', 3, '17:00', '19:00', TRUE),
    -- Karim
    ('55555555-5555-5555-5555-555555555555', 5, '20:00', '22:00', TRUE),
    -- Lina
    ('66666666-6666-6666-6666-666666666666', 6, '14:00', '18:00', TRUE);

-- =====================================================================
-- 4) SESSIONS D'ETUDE (cles pour le dashboard admin)
--    Mix de COMPLETED (passees) + PLANNED (futures) + qq CANCELLED
-- =====================================================================

-- ---- Sessions COMPLETED ces 4 dernieres semaines (Asmae) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, actual_duration, notes) VALUES
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Algèbre - Espaces vectoriels',  now() - INTERVAL '25 days', now() - INTERVAL '25 days' + INTERVAL '90 min', 'COMPLETED', 90, 85,  'Chapitre 3 termine'),
    ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Spring Security - JWT',         now() - INTERVAL '24 days', now() - INTERVAL '24 days' + INTERVAL '120 min','COMPLETED',120,110, 'Tutoriel + projet'),
    ('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'Tri rapide + complexité',       now() - INTERVAL '22 days', now() - INTERVAL '22 days' + INTERVAL '60 min', 'COMPLETED', 60, 55,  'Implémentation Java'),
    ('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'TOEIC - Listening',             now() - INTERVAL '20 days', now() - INTERVAL '20 days' + INTERVAL '45 min', 'COMPLETED', 45, 50,  'Score : 750'),
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Analyse - Limites',             now() - INTERVAL '18 days', now() - INTERVAL '18 days' + INTERVAL '90 min', 'COMPLETED', 90, 90,  ''),
    ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'JPA - Relations',               now() - INTERVAL '17 days', now() - INTERVAL '17 days' + INTERVAL '120 min','COMPLETED',120,115, ''),
    ('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'Graphes - BFS/DFS',             now() - INTERVAL '15 days', now() - INTERVAL '15 days' + INTERVAL '90 min', 'COMPLETED', 90, 80,  ''),
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Algèbre - Diagonalisation',     now() - INTERVAL '12 days', now() - INTERVAL '12 days' + INTERVAL '90 min', 'COMPLETED', 90, 95,  'Difficile'),
    ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Spring Boot - REST API',        now() - INTERVAL '10 days', now() - INTERVAL '10 days' + INTERVAL '120 min','COMPLETED',120,120, ''),
    ('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'TOEIC - Reading',               now() - INTERVAL '8 days',  now() - INTERVAL '8 days'  + INTERVAL '45 min', 'COMPLETED', 45, 40,  ''),
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Maths - Révision examen',       now() - INTERVAL '5 days',  now() - INTERVAL '5 days'  + INTERVAL '120 min','COMPLETED',120,130, 'Bien réussi'),
    ('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'Algo - Dynamic Programming',    now() - INTERVAL '3 days',  now() - INTERVAL '3 days'  + INTERVAL '90 min', 'COMPLETED', 90, 95,  ''),
    -- Hier
    ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Java - Streams',                now() - INTERVAL '1 day',   now() - INTERVAL '1 day'   + INTERVAL '60 min', 'COMPLETED', 60, 65,  '');

-- ---- Sessions COMPLETED (Youssef) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, actual_duration, notes) VALUES
    ('33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Angular - Routing',             now() - INTERVAL '20 days', now() - INTERVAL '20 days' + INTERVAL '90 min', 'COMPLETED', 90, 95,  ''),
    ('33333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'PostgreSQL - Joins',            now() - INTERVAL '18 days', now() - INTERVAL '18 days' + INTERVAL '60 min', 'COMPLETED', 60, 60,  ''),
    ('33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'React - Hooks',                 now() - INTERVAL '15 days', now() - INTERVAL '15 days' + INTERVAL '90 min', 'COMPLETED', 90, 85,  ''),
    ('33333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Docker - Compose',              now() - INTERVAL '12 days', now() - INTERVAL '12 days' + INTERVAL '60 min', 'COMPLETED', 60, 55,  ''),
    ('33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'REST API - Best practices',     now() - INTERVAL '8 days',  now() - INTERVAL '8 days'  + INTERVAL '90 min', 'COMPLETED', 90, 90,  ''),
    ('33333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'MongoDB - Aggregation',         now() - INTERVAL '5 days',  now() - INTERVAL '5 days'  + INTERVAL '90 min', 'COMPLETED', 90, 80,  ''),
    ('33333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'CI/CD - GitHub Actions',        now() - INTERVAL '2 days',  now() - INTERVAL '2 days'  + INTERVAL '60 min', 'COMPLETED', 60, 70,  '');

-- ---- Sessions COMPLETED (Sara) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, actual_duration, notes) VALUES
    ('44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Quantique - Schrödinger',       now() - INTERVAL '14 days', now() - INTERVAL '14 days' + INTERVAL '120 min','COMPLETED',120,110, ''),
    ('44444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'Chimie - Stéréoisomérie',       now() - INTERVAL '10 days', now() - INTERVAL '10 days' + INTERVAL '90 min', 'COMPLETED', 90, 85,  ''),
    ('44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Quantique - Dirac',             now() - INTERVAL '6 days',  now() - INTERVAL '6 days'  + INTERVAL '90 min', 'COMPLETED', 90, 100, ''),
    ('44444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'Chimie - Mécanismes',           now() - INTERVAL '2 days',  now() - INTERVAL '2 days'  + INTERVAL '60 min', 'COMPLETED', 60, 65,  '');

-- ---- Sessions COMPLETED (Karim) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, actual_duration, notes) VALUES
    ('55555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', 'Macro - PIB',                   now() - INTERVAL '12 days', now() - INTERVAL '12 days' + INTERVAL '60 min', 'COMPLETED', 60, 60,  ''),
    ('55555555-5555-5555-5555-555555555555', 'd2222222-2222-2222-2222-222222222222', 'Marketing digital',             now() - INTERVAL '9 days',  now() - INTERVAL '9 days'  + INTERVAL '90 min', 'COMPLETED', 90, 90,  ''),
    ('55555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', 'Micro - Demande',               now() - INTERVAL '4 days',  now() - INTERVAL '4 days'  + INTERVAL '60 min', 'COMPLETED', 60, 55,  '');

-- ---- Sessions COMPLETED (Lina + Omar + Fatima) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, actual_duration, notes) VALUES
    ('66666666-6666-6666-6666-666666666666', 'e1111111-1111-1111-1111-111111111111', 'Figma - Composants',            now() - INTERVAL '8 days',  now() - INTERVAL '8 days'  + INTERVAL '90 min', 'COMPLETED', 90, 85,  ''),
    ('66666666-6666-6666-6666-666666666666', 'e2222222-2222-2222-2222-222222222222', 'CSS - Flexbox',                 now() - INTERVAL '3 days',  now() - INTERVAL '3 days'  + INTERVAL '60 min', 'COMPLETED', 60, 60,  ''),
    ('77777777-7777-7777-7777-777777777777', 'f1111111-1111-1111-1111-111111111111', 'Pandas - DataFrames',           now() - INTERVAL '6 days',  now() - INTERVAL '6 days'  + INTERVAL '120 min','COMPLETED',120,115, ''),
    ('77777777-7777-7777-7777-777777777777', 'f2222222-2222-2222-2222-222222222222', 'Stats - Lois usuelles',         now() - INTERVAL '2 days',  now() - INTERVAL '2 days'  + INTERVAL '90 min', 'COMPLETED', 90, 95,  ''),
    ('88888888-8888-8888-8888-888888888888', 'a5555555-5555-5555-5555-555555555555', 'Droit - Constitution',          now() - INTERVAL '5 days',  now() - INTERVAL '5 days'  + INTERVAL '90 min', 'COMPLETED', 90, 100, '');

-- ---- Sessions PLANNED cette semaine et la suivante ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, notes) VALUES
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Maths - Examen blanc',          now() + INTERVAL '1 day',  now() + INTERVAL '1 day'  + INTERVAL '120 min', 'PLANNED', 120, 'Examen blanc'),
    ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Java - Patterns design',        now() + INTERVAL '2 days', now() + INTERVAL '2 days' + INTERVAL '90 min',  'PLANNED',  90, ''),
    ('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'Algo - Tris efficaces',         now() + INTERVAL '4 days', now() + INTERVAL '4 days' + INTERVAL '60 min',  'PLANNED',  60, ''),
    ('33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Angular - Signals',             now() + INTERVAL '1 day',  now() + INTERVAL '1 day'  + INTERVAL '90 min',  'PLANNED',  90, ''),
    ('33333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Kubernetes - Pods',             now() + INTERVAL '3 days', now() + INTERVAL '3 days' + INTERVAL '120 min', 'PLANNED', 120, ''),
    ('44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Quantique - TP',                now() + INTERVAL '2 days', now() + INTERVAL '2 days' + INTERVAL '90 min',  'PLANNED',  90, ''),
    ('55555555-5555-5555-5555-555555555555', 'd2222222-2222-2222-2222-222222222222', 'Marketing - Étude de cas',      now() + INTERVAL '5 days', now() + INTERVAL '5 days' + INTERVAL '60 min',  'PLANNED',  60, ''),
    ('66666666-6666-6666-6666-666666666666', 'e1111111-1111-1111-1111-111111111111', 'Design - Audit UX',             now() + INTERVAL '1 day',  now() + INTERVAL '1 day'  + INTERVAL '90 min',  'PLANNED',  90, ''),
    ('77777777-7777-7777-7777-777777777777', 'f1111111-1111-1111-1111-111111111111', 'ML - Régression linéaire',      now() + INTERVAL '3 days', now() + INTERVAL '3 days' + INTERVAL '120 min', 'PLANNED', 120, ''),
    ('88888888-8888-8888-8888-888888888888', 'a5555555-5555-5555-5555-555555555555', 'Droit - Cas pratique',          now() + INTERVAL '2 days', now() + INTERVAL '2 days' + INTERVAL '60 min',  'PLANNED',  60, ''),
    ('99999999-9999-9999-9999-999999999999', 'a6666666-6666-6666-6666-666666666666', 'Finance - Bilan compte',        now() + INTERVAL '1 day',  now() + INTERVAL '1 day'  + INTERVAL '90 min',  'PLANNED',  90, '');

-- ---- Sessions CANCELLED (un peu) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, notes) VALUES
    ('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'TOEIC - Speaking', now() - INTERVAL '7 days', now() - INTERVAL '7 days' + INTERVAL '45 min', 'CANCELLED', 45, 'Migraine'),
    ('33333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'BDD - Index',      now() - INTERVAL '4 days', now() - INTERVAL '4 days' + INTERVAL '60 min', 'CANCELLED', 60, 'Imprévu');

-- ---- Sessions IN_PROGRESS (en cours maintenant) ----
INSERT INTO study_sessions (user_id, subject_id, title, start_date_time, end_date_time, status, planned_duration, notes) VALUES
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Maths - Series', now() - INTERVAL '20 min', now() + INTERVAL '70 min', 'IN_PROGRESS', 90, 'Session active');

-- =====================================================================
-- 5) OBJECTIFS HEBDOMADAIRES (semaine courante)
-- =====================================================================
INSERT INTO weekly_goals (user_id, subject_id, week_start, week_end, target_hours, achieved_hours, is_achieved) VALUES
    ('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date, 10,  6, FALSE),
    ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,  8,  5, FALSE),
    ('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,  3,  3, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,  9,  7, FALSE),
    ('44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,  8,  4, FALSE),
    ('55555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date,  7,  2, FALSE);

-- =====================================================================
-- 6) GROUPES D'ETUDE
-- =====================================================================
INSERT INTO study_groups (id, name, description, is_private, max_members, created_by, created_at) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'Java Spring Boot 2026',  'Entraide Spring Boot pour étudiants',     FALSE, 20, '22222222-2222-2222-2222-222222222222', now() - INTERVAL '40 days'),
    ('aaaa2222-2222-2222-2222-222222222222', 'Algo & Compétition',     'Préparation aux concours d''algo',         FALSE, 15, '22222222-2222-2222-2222-222222222222', now() - INTERVAL '30 days'),
    ('aaaa3333-3333-3333-3333-333333333333', 'Web Modern Stack',       'Angular, React, Vue, Svelte',             FALSE, 25, '33333333-3333-3333-3333-333333333333', now() - INTERVAL '25 days'),
    ('aaaa4444-4444-4444-4444-444444444444', 'Quantum Physics Club',   'Discussions et exercices',                 TRUE,  10, '44444444-4444-4444-4444-444444444444', now() - INTERVAL '20 days'),
    ('aaaa5555-5555-5555-5555-555555555555', 'Data Science Bootcamp',  'ML / DL / Stats appliquées',              FALSE, 30, '77777777-7777-7777-7777-777777777777', now() - INTERVAL '10 days');

-- =====================================================================
-- 7) MEMBERSHIPS (owners + members)
-- =====================================================================
INSERT INTO group_memberships (group_id, user_id, role, is_active) VALUES
    -- Java Spring Boot 2026
    ('aaaa1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'OWNER',     TRUE),
    ('aaaa1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'MODERATOR', TRUE),
    ('aaaa1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'MEMBER',    TRUE),
    ('aaaa1111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'MEMBER',    TRUE),
    ('aaaa1111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'MEMBER',    TRUE),
    -- Algo & Compétition
    ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'OWNER',     TRUE),
    ('aaaa2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'MEMBER',    TRUE),
    ('aaaa2222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'MEMBER',    TRUE),
    -- Web Modern Stack
    ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'OWNER',     TRUE),
    ('aaaa3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'MEMBER',    TRUE),
    ('aaaa3333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'MEMBER',    TRUE),
    -- Quantum Physics Club (privé)
    ('aaaa4444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'OWNER',     TRUE),
    ('aaaa4444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'MODERATOR', TRUE),
    -- Data Science Bootcamp
    ('aaaa5555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'OWNER',     TRUE),
    ('aaaa5555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'MEMBER',    TRUE),
    ('aaaa5555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'MEMBER',    TRUE),
    ('aaaa5555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'MEMBER',    TRUE),
    ('aaaa5555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'MEMBER',    TRUE),
    ('aaaa5555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999999', 'MEMBER',    TRUE);

-- =====================================================================
-- 8) INVITATIONS (mix PENDING / ACCEPTED / DECLINED)
-- =====================================================================
INSERT INTO group_invitations (group_id, sender_id, recipient_id, message, status, sent_at, expires_at) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Salut Sara, rejoins-nous pour Spring Boot !',  'PENDING',  now() - INTERVAL '2 days', now() + INTERVAL '5 days'),
    ('aaaa1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', NULL,                                            'PENDING',  now() - INTERVAL '1 day',  now() + INTERVAL '6 days'),
    ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'Bienvenue chez Web Modern Stack',               'PENDING',  now() - INTERVAL '4 days', now() + INTERVAL '3 days'),
    ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'On t''attend en algo !',                       'DECLINED', now() - INTERVAL '10 days', now() - INTERVAL '3 days'),
    ('aaaa5555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'Tu veux faire de la data avec nous ?',          'PENDING',  now() - INTERVAL '12 hours', now() + INTERVAL '7 days');

-- =====================================================================
-- 9) SESSIONS PARTAGEES (le user partage une session avec son groupe)
-- =====================================================================
INSERT INTO shared_sessions (session_id, group_id, shared_by, message)
SELECT s.id, 'aaaa1111-1111-1111-1111-111111111111', s.user_id, 'Session intéressante, on en discute ?'
FROM study_sessions s
WHERE s.user_id = '22222222-2222-2222-2222-222222222222'
  AND s.status = 'COMPLETED'
ORDER BY s.start_date_time DESC
LIMIT 2;

INSERT INTO shared_sessions (session_id, group_id, shared_by, message)
SELECT s.id, 'aaaa5555-5555-5555-5555-555555555555', s.user_id, 'À reproduire en groupe.'
FROM study_sessions s
WHERE s.user_id = '77777777-7777-7777-7777-777777777777'
  AND s.status = 'COMPLETED'
ORDER BY s.start_date_time DESC
LIMIT 1;

-- =====================================================================
-- FIN
-- =====================================================================
-- Recap :
--   - 9 utilisateurs (1 ADMIN, 8 USER) avec mdp "Password123!"
--   - 17 matieres
--   - 12 disponibilites
--   - ~30 sessions COMPLETED, 11 PLANNED, 2 CANCELLED, 1 IN_PROGRESS
--   - 6 weekly_goals
--   - 5 groupes, 19 memberships, 5 invitations, 3 sessions partagees
--
-- Connexion admin :
--   email : admin@studyflow.io
--   mdp   : Password123!
-- =====================================================================
