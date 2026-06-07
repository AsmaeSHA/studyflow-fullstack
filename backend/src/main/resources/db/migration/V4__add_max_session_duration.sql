-- =====================================================================
-- StudyFlow - Ajout colonne max_session_duration pour le Scheduler intelligent
-- A executer une seule fois dans le SQL Editor de Supabase.
-- =====================================================================

ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS max_session_duration integer;

COMMENT ON COLUMN public.subjects.max_session_duration IS
    'Duree max d''une session pour cette matiere (en minutes). NULL = utilise le max global du Scheduler.';

-- Petit jeu de valeurs raisonnables sur les matieres existantes de demo (optionnel)
UPDATE public.subjects
   SET max_session_duration = CASE
       WHEN priority >= 5 THEN 90
       WHEN priority >= 3 THEN 60
       ELSE 45
   END
 WHERE max_session_duration IS NULL;
