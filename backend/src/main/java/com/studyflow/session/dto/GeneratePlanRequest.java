package com.studyflow.session.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Payload pour declencher la generation automatique d'un plan d'etude.
 *
 * @param weekStart           date du lundi (ou autre jour) marquant le debut de la semaine cible
 * @param maxSessionDuration  duree maximale d'une seule session en minutes (defaut 90)
 * @param minSessionDuration  duree minimale d'une seule session en minutes (defaut 30)
 * @param breakBetweenMinutes pause minimale entre deux sessions consecutives (defaut 15)
 * @param replaceExisting     si true, supprime les sessions PLANNED de la semaine avant generation
 */
public record GeneratePlanRequest(

        @NotNull
        LocalDate weekStart,

        @Min(15)
        Integer maxSessionDuration,

        @Min(15)
        Integer minSessionDuration,

        @Min(0)
        Integer breakBetweenMinutes,

        Boolean replaceExisting
) {
    public int maxSessionDurationOrDefault()  { return maxSessionDuration  != null ? maxSessionDuration  : 90; }
    public int minSessionDurationOrDefault()  { return minSessionDuration  != null ? minSessionDuration  : 30; }
    public int breakBetweenMinutesOrDefault() { return breakBetweenMinutes != null ? breakBetweenMinutes : 15; }
    public boolean replaceExistingOrDefault() { return replaceExisting != null && replaceExisting; }
}
