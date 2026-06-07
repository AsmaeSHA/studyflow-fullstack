import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from '../../../core/models/models';

export interface SubjectProgressRow {
  subject: Subject;
  achievedHours: number;
  /** progress en % (0..100) */
  progress: number;
}

/**
 * Tableau "Progression par matière" — colonnes:
 *   matière · objectif hebdo · heures réalisées · progress · priorité
 */
@Component({
  selector: 'app-subject-progress-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spt-wrap">
      <table class="spt">
        <thead>
          <tr>
            <th>Matière</th>
            <th>Objectif</th>
            <th>Réalisé</th>
            <th class="prog">Progression</th>
            <th>Priorité</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows">
            <td>
              <div class="subj">
                <span class="dot" [style.background]="r.subject.color"></span>
                <div>
                  <div class="name">{{ r.subject.name }}</div>
                  <div class="desc" *ngIf="r.subject.description">{{ r.subject.description }}</div>
                </div>
              </div>
            </td>
            <td>{{ r.subject.weeklyGoalHours }}h</td>
            <td>{{ r.achievedHours }}h</td>
            <td class="prog">
              <div class="bar">
                <div class="fill"
                     [style.width.%]="r.progress"
                     [style.background]="r.subject.color"></div>
              </div>
              <span class="pct">{{ r.progress }}%</span>
            </td>
            <td>
              <span class="prio" [class]="'prio-' + r.subject.priority">
                P{{ r.subject.priority }}
              </span>
            </td>
          </tr>
          <tr *ngIf="!rows?.length">
            <td colspan="5" class="empty">Aucune matière</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .spt-wrap { overflow-x:auto; }
    .spt { width:100%; border-collapse:collapse; font-size:13.5px; }
    .spt th {
      text-align:left; padding:10px 12px;
      font-size:11px; font-weight:700; color:#7A7A7A;
      letter-spacing:.06em; text-transform:uppercase;
      border-bottom:1px solid rgba(0,0,0,.06);
    }
    .spt td {
      padding:14px 12px;
      border-bottom:1px solid rgba(0,0,0,.04);
      color:#1A1A1A; vertical-align:middle;
    }
    .spt tr:hover td { background:rgba(245,197,24,.04); }
    .subj { display:flex; align-items:center; gap:10px; }
    .subj .dot { width:10px; height:10px; border-radius:50%; flex:none; }
    .subj .name { font-weight:700; }
    .subj .desc { font-size:11.5px; color:#999; margin-top:1px; }

    .prog { min-width:200px; display:flex; align-items:center; gap:10px; }
    .bar { flex:1; height:6px; background:rgba(0,0,0,.06); border-radius:6px; overflow:hidden; }
    .fill { height:100%; border-radius:6px; transition: width 600ms cubic-bezier(.16,1,.3,1); }
    .pct { font-size:12px; font-weight:700; color:#1A1A1A; min-width:38px; }

    .prio { padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.04em; }
    .prio-5 { background:#FFE5E0; color:#C04A3A; }
    .prio-4 { background:#FFF3D9; color:#8B6E00; }
    .prio-3 { background:#FFFBDD; color:#8B6E00; }
    .prio-2 { background:#E6F4F1; color:#1A7A4A; }
    .prio-1 { background:#EEF2FF; color:#3951D3; }

    .empty { text-align:center; color:#999; padding:24px; }
  `]
})
export class SubjectProgressTableComponent {
  @Input() rows: SubjectProgressRow[] = [];
}
