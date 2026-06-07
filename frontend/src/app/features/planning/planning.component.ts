import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { SubjectService } from '../../core/services/subject.service';
import { AvailabilityService } from '../../core/services/availability.service';
import { SessionService } from '../../core/services/session.service';
import { PlanningStateService } from '../../core/services/planning-state.service';

import { Subject, Availability, StudySession } from '../../core/models/models';

import { SubjectFormComponent } from '../../shared/components/subject-form/subject-form.component';
import { AvailabilityFormComponent } from '../../shared/components/availability-form/availability-form.component';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_LABELS_LONG = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

/**
 * Page Planning — orchestre matières, dispos, contraintes
 * et un mock-scheduler frontal (generatePlan).
 *
 * Le planning généré est stocké dans `PlanningStateService` puis
 * affiché en aperçu (3 sessions max). Pour la vue détaillée
 * l'utilisateur clique sur "Voir plus" -> /calendar.
 *
 * Aligné sur la classe `Scheduler` du diagramme UML — quand le
 * backend Spring Boot sera prêt, l'algorithme local sera remplacé
 * par un appel à `POST /api/scheduler/generate`.
 */
@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, SubjectFormComponent, AvailabilityFormComponent],
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss'],
})
export class PlanningComponent {
  private subSvc   = inject(SubjectService);
  private availSvc = inject(AvailabilityService);
  private sessSvc  = inject(SessionService);
  private router   = inject(Router);
  readonly planSvc = inject(PlanningStateService);

  constructor() {
    // GET /api/subjects + /api/users/me/availabilities au montage
    this.subSvc.list().subscribe();
    this.availSvc.list().subscribe();
  }

  // Helper for templates
  Math = Math;

  // Read-only state from services.
  subjects = this.subSvc.subjects;
  slots    = this.availSvc.slots;

  subjectsSorted = computed(() =>
    [...this.subjects()].sort((a, b) => b.priority - a.priority)
  );
  slotsSorted = computed(() =>
    [...this.slots()].sort((a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
    )
  );

  // UI state.
  showSubjectForm = signal(false);
  editingSubject  = signal<Subject | null>(null);
  showAvailabilityForm = signal(false);
  generating = signal(false);

  get constraints() { return this.planSvc.constraints(); }

  priorityMap = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    this.subjects().forEach(s => map[s.id] = s.priority);
    return map;
  });

  // Mini week strip (lundi..dimanche) — inclut les sessions par jour
  weekStrip = computed(() => {
    const today = new Date();
    const todayIso = this.iso(today);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0,0,0,0);
    const labels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const longLabels = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
    const sessions = this.planSvc.generated();

    return labels.map((label, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const iso = this.iso(d);
      const daySessions = sessions
        .filter(s => s.startDateTime.slice(0, 10) === iso)
        .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
      return {
        label, longLabel: longLabels[i],
        dayNum: d.getDate(),
        count: daySessions.length,
        sessions: daySessions,
        isToday: iso === todayIso,
        iso,
      };
    });
  });


  // ── Bilan : répartition par matière ───────────
  subjectBreakdown = computed(() => {
    const map = new Map<string, { name: string; color: string; minutes: number; count: number }>();
    this.planSvc.generated().forEach(s => {
      const key = s.subjectId || s.subjectName || '?';
      const e = map.get(key);
      if (e) { e.minutes += s.plannedDuration || 0; e.count++; }
      else map.set(key, {
        name: s.subjectName || 'Sans nom',
        color: s.subjectColor || '#f5c518',
        minutes: s.plannedDuration || 0,
        count: 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  });

  maxSubjectMinutes = computed(() =>
    Math.max(1, ...this.subjectBreakdown().map(s => s.minutes))
  );

  // ── Bilan : charge par jour ────────────────
  dayBreakdown = computed(() =>
    this.weekStrip().map(d => ({
      label:   d.label,
      longLabel: d.longLabel,
      dayNum:  d.dayNum,
      count:   d.count,
      isToday: d.isToday,
      minutes: d.sessions.reduce((acc, s) => acc + (s.plannedDuration || 0), 0),
    }))
  );

  maxDayMinutes = computed(() =>
    Math.max(1, ...this.dayBreakdown().map(d => d.minutes))
  );

  toHours(min: number): string {
    const h = min / 60;
    return Number.isInteger(h) ? h + 'h' : h.toFixed(1) + 'h';
  }

  // ── Stats ──────────────────────────────────────
  get totalAvailableHours(): number {
    const min = this.slots().reduce((acc, s) => {
      const [h1, m1] = s.startTime.split(':').map(Number);
      const [h2, m2] = s.endTime.split(':').map(Number);
      return acc + Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
    }, 0);
    return Math.round((min / 60) * 10) / 10;
  }

  get totalGoalHours(): number {
    return this.subjects().reduce((a, s) => a + (s.weeklyGoalHours || 0), 0);
  }

  // ── Subjects CRUD ──────────────────────────────
  openSubjectForm() { this.editingSubject.set(null); this.showSubjectForm.set(true); }
  editSubject(s: Subject) { this.editingSubject.set(s); this.showSubjectForm.set(true); }
  closeSubjectForm() { this.showSubjectForm.set(false); this.editingSubject.set(null); }

  saveSubject(s: Omit<Subject, 'id' | 'createdAt' | 'completionRate'>) {
    const editing = this.editingSubject();
    if (editing) {
      this.subSvc.update(editing.id, s).subscribe();
    } else {
      this.subSvc.add(s).subscribe();
    }
    this.closeSubjectForm();
  }

  deleteSubject(id: string) {
    if (confirm('Supprimer cette matière ?')) this.subSvc.delete(id).subscribe();
  }

  // ── Availability CRUD ──────────────────────────
  saveAvailability(a: Omit<Availability, 'id'>) {
    this.availSvc.add(a).subscribe({
      next: () => this.showAvailabilityForm.set(false),
      error: (e) => alert(e?.error?.message || 'Erreur lors de l\'ajout de la disponibilite.')
    });
  }
  deleteSlot(id: string) { this.availSvc.delete(id).subscribe(); }

  dayLabel(i: number): string { return DAY_LABELS[i] || ''; }

  updateConstraint(key: 'maxSessionDuration' | 'maxSessionsPerDay' | 'breakBetweenMin', value: number) {
    this.planSvc.setConstraints({ [key]: +value });
  }

  // ── Helpers ────────────────────────────────────
  formatTime(dt: string) {
    return dt?.slice(11, 16) || '';
  }
  formatDay(dt: string) {
    if (!dt) return '';
    const d = new Date(dt);
    return DAY_LABELS_LONG[d.getDay()].slice(0, 3) + ' ' + d.getDate();
  }
  priorityOf(s: StudySession): number {
    return this.priorityMap()[s.subjectId] ?? 3;
  }
  generatedAgo(): string {
    const at = this.planSvc.generatedAt();
    if (!at) return '';
    const diff = Date.now() - new Date(at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'à l instant';
    if (m < 60) return 'il y a ' + m + ' min';
    return 'il y a ' + Math.floor(m / 60) + 'h';
  }

  private iso(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }

  // ── MOCK SCHEDULER ─────────────────────────────
  /**
   * Algorithme :
   *   1. Tri des matières par priorité décroissante
   *   2. Pour chaque matière, allouer ses heures hebdo dans les
   *      créneaux dispos en respectant maxSessionDuration et la pause.
   *   3. Avancer un curseur dans chaque créneau pour éviter les overlaps.
   */
  /**
   * Genere le planning via POST /api/sessions/generate-plan (backend Scheduler).
   * Les sessions sont persistees en base et retournees au frontend.
   */
  generatePlan() {
    if (!this.subjects().length || !this.slots().length) {
      alert('Definis au moins une matiere et un creneau de disponibilite.');
      return;
    }
    this.generating.set(true);

    const c = this.planSvc.constraints();
    this.planSvc.generate({
      maxSessionDuration:  c.maxSessionDuration  || 90,
      minSessionDuration:  c.minSessionDuration  || 30,
      breakBetweenMinutes: c.breakBetweenMinutes ?? c.breakBetweenMin ?? 15,
      replaceExisting: true
    })
    .then(() => this.generating.set(false))
    .catch(err => {
      console.error('[planning] Echec generation', err);
      alert(err?.error?.message || 'Erreur lors de la generation du plan.');
      this.generating.set(false);
    });
  }

  resetGenerated() {
    if (confirm('Réinitialiser le planning généré ?')) this.planSvc.reset();
  }

  goCalendar(mode: 'day' | 'week' = 'week') {
    this.router.navigate(['/calendar'], { queryParams: { source: 'planning', mode } });
  }
}
