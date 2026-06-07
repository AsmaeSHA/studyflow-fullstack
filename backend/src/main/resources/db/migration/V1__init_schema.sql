-- =====================================================================
-- StudyFlow - Schéma PostgreSQL (Supabase)
-- Version: 1.0
-- Description: Création initiale des tables, enums, indexes, contraintes
-- À exécuter dans le SQL Editor de Supabase
-- =====================================================================

-- Extension pour la génération d'UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('OWNER', 'MEMBER', 'MODERATOR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('SESSION_REMINDER', 'GROUP_INVITATION', 'GOAL_ACHIEVED', 'NEW_MESSAGE', 'SESSION_SHARED', 'GROUP_JOINED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------
-- TABLE : users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ---------------------------------------------------------------------
-- TABLE : refresh_tokens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(512) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ---------------------------------------------------------------------
-- TABLE : subjects
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(150) NOT NULL,
    color               VARCHAR(20)  NOT NULL DEFAULT '#2E86AB',
    priority            INTEGER      NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    weekly_goal_hours   REAL         NOT NULL DEFAULT 0,
    description         TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user     ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_priority ON subjects(priority);

-- ---------------------------------------------------------------------
-- TABLE : weekly_goals
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
    week_start      DATE NOT NULL,
    week_end        DATE NOT NULL,
    target_hours    REAL NOT NULL DEFAULT 0,
    achieved_hours  REAL NOT NULL DEFAULT 0,
    is_achieved     BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_week_range CHECK (week_end >= week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week ON weekly_goals(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_subject   ON weekly_goals(subject_id);

-- ---------------------------------------------------------------------
-- TABLE : availabilities
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availabilities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    is_recurring    BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from      DATE,
    valid_until     DATE,
    CONSTRAINT chk_availability_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availabilities_user ON availabilities(user_id);

-- ---------------------------------------------------------------------
-- TABLE : study_sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id          UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title               VARCHAR(200) NOT NULL,
    start_date_time     TIMESTAMPTZ NOT NULL,
    end_date_time       TIMESTAMPTZ NOT NULL,
    status              session_status NOT NULL DEFAULT 'PLANNED',
    is_shared           BOOLEAN NOT NULL DEFAULT FALSE,
    planned_duration    INTEGER,
    actual_duration     INTEGER,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_session_dates CHECK (end_date_time > start_date_time)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_start ON study_sessions(user_id, start_date_time);
CREATE INDEX IF NOT EXISTS idx_sessions_subject    ON study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON study_sessions(status);

-- ---------------------------------------------------------------------
-- TABLE : study_groups
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    is_private      BOOLEAN NOT NULL DEFAULT FALSE,
    max_members     INTEGER NOT NULL DEFAULT 10 CHECK (max_members > 0),
    chat_room_id    VARCHAR(36),  -- ObjectId MongoDB référençant chat_rooms
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON study_groups(created_by);

-- ---------------------------------------------------------------------
-- TABLE : group_memberships
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            member_role NOT NULL DEFAULT 'MEMBER',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membership UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user  ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_group ON group_memberships(group_id);

-- ---------------------------------------------------------------------
-- TABLE : group_invitations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT,
    status          invitation_status NOT NULL DEFAULT 'PENDING',
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_invitations_recipient ON group_invitations(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_group     ON group_invitations(group_id);

-- ---------------------------------------------------------------------
-- TABLE : shared_sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    group_id        UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    shared_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    shared_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    message         TEXT,
    CONSTRAINT uq_shared UNIQUE (session_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_sessions_group ON shared_sessions(group_id);

-- ---------------------------------------------------------------------
-- TABLE : group_messages (historique SQL optionnel du chat de groupe)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL CHECK (length(trim(content)) > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);

-- ---------------------------------------------------------------------
-- TABLE : notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(180) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------
-- TRIGGER : maintenir updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
