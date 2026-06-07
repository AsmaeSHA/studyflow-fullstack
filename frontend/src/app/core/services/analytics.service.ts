import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { ProductivityStat, DashboardSummary } from '../models/models';
import { AdminGlobalStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly base = environment.apiUrl + '/analytics';
  private http = inject(HttpClient);

  /** Cache mutable pour les stats admin (les composants gardent la reference). */
  private readonly adminStatsRef: AdminGlobalStats = this.emptyAdminStats();
  private adminStatsLoading = false;
  private adminStatsLoadedAt = 0;
  private adminStatsRequest$: Observable<AdminGlobalStats> | null = null;
  private readonly ADMIN_STATS_TTL_MS = 30_000; // 30s : on ne re-fetch pas plus souvent

  dashboard(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/dashboard`);
  }
  myStats(): Observable<ProductivityStat[]> {
    return this.http.get<ProductivityStat[]>(`${this.base}/stats`);
  }
  week(weekStart: string): Observable<ProductivityStat> {
    const params = new HttpParams().set('weekStart', weekStart);
    return this.http.get<ProductivityStat>(`${this.base}/stats/week`, { params });
  }
  compute(weekStart: string): Observable<ProductivityStat> {
    const params = new HttpParams().set('weekStart', weekStart);
    return this.http.post<ProductivityStat>(`${this.base}/stats/compute`, null, { params });
  }

  /**
   * Retourne l'objet stats admin "vivant" : la reference est stable, son contenu
   * est rempli en async via /api/admin/stats/global. Les composants qui font
   * `readonly stats = svc.getAdminStats()` voient les valeurs se mettre a jour
   * automatiquement (la prochaine detection de changement les affiche).
   */
  getAdminStats(): AdminGlobalStats {
    if (!this.isAdminStatsFresh()) {
      this.refreshAdminStats().subscribe({
        error: () => { this.adminStatsLoading = false; }
      });
    }
    return this.adminStatsRef;
  }

  /** Renvoie true si le cache est encore frais (chargement evite). */
  isAdminStatsFresh(): boolean {
    return this.adminStatsLoadedAt > 0
        && (Date.now() - this.adminStatsLoadedAt) < this.ADMIN_STATS_TTL_MS;
  }

  /**
   * Recharge les stats admin. Si le cache est encore frais, renvoie un Observable
   * qui resout immediatement avec le cache (aucune requete HTTP).
   * `force=true` ignore le TTL et refait toujours le HTTP.
   */
  refreshAdminStats(force = false): Observable<AdminGlobalStats> {
    if (!force && this.isAdminStatsFresh()) {
      return of(this.adminStatsRef);
    }

    if (!force && this.adminStatsRequest$) {
      return this.adminStatsRequest$;
    }

    this.adminStatsLoading = true;
    this.adminStatsRequest$ = this.http.get<AdminGlobalStats>(`${environment.apiUrl}/admin/stats/global`).pipe(
      tap(stats => {
        Object.assign(this.adminStatsRef, stats);
        this.adminStatsLoadedAt = Date.now();
      }),
      finalize(() => {
        this.adminStatsLoading = false;
        this.adminStatsRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.adminStatsRequest$;
  }

  private emptyAdminStats(): AdminGlobalStats {
    return {
      totalUsers: 0, activeUsers: 0, adminUsers: 0, disabledUsers: 0, newUsersThisWeek: 0,
      totalSessions: 0, completedSessions: 0, plannedSessions: 0, cancelledSessions: 0, globalCompletionRate: 0,
      totalGroups: 0, totalMessages: 0,
      totalStudiedHours: 0, avgSessionDurationMin: 0, longestSessionMin: 0,
      weeklyData: [], topSubjects: []
    };
  }
}
