package com.studyflow.session;

/**
 * Statut d'une session d'etude.
 * Mappe sur l'enum PostgreSQL session_status.
 */
public enum SessionStatus {
    PLANNED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
