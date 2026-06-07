import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { DashboardSummary } from '../models/models';
import { DayActivity } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private analytics = inject(AnalyticsService);

  /** Retourne le DashboardSummary brut du backend. */
  getSummary(): Observable<DashboardSummary> {
    return this.analytics.dashboard();
  }

  /** Activite du mois - placeholder. Quand un endpoint dedie sera ajoute, le brancher ici. */
  getMonthActivity(): Observable<DayActivity[]> {
    return of([]);
  }
}
