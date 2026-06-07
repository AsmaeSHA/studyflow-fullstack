import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor JWT avec REFRESH AUTOMATIQUE.
 *
 *  - Ajoute le Bearer access token aux requetes sortantes (sauf /auth/*).
 *  - Sur 401 d'une requete metier :
 *      1) tente un POST /auth/refresh avec le refresh token
 *      2) si OK, rejoue la requete originale avec le NOUVEAU access token
 *      3) si KO, deconnecte l'utilisateur et redirige vers /auth/login
 *  - Les requetes concurrentes pendant un refresh attendent le meme token
 *    via un BehaviorSubject partage (evite N refresh en parallele).
 *
 *  Endpoints exclus de la deconnexion automatique :
 *  - /auth/* (login/register/refresh) : 401 = mauvais identifiants
 *  - /users/me/password : 401 = mauvais mot de passe actuel (raison metier)
 */

// Etat partage entre tous les appels de l'interceptor
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = localStorage.getItem('accessToken');

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh');

  // Endpoints qui peuvent renvoyer 401 pour une raison metier
  // (pas pour un token expire) — on ne deconnecte PAS sur ces 401.
  const isBusinessAuthEndpoint =
    req.url.includes('/users/me/password');

  const authReq = token && !isAuthEndpoint ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (
        err.status === 401 &&
        !isAuthEndpoint &&
        !isBusinessAuthEndpoint
      ) {
        return handle401(req, next, auth, router);
      }
      return throwError(() => err);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  // Si un refresh est deja en cours, on attend qu'il finisse
  if (isRefreshing) {
    return refreshSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(newToken => next(addToken(originalReq, newToken))),
    );
  }

  // Pas de refresh token = inutile de tenter
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    forceLogout(router);
    return throwError(() => new Error('Pas de refresh token'));
  }

  // Lance le refresh
  isRefreshing = true;
  refreshSubject.next(null);

  return auth.refresh().pipe(
    switchMap(res => {
      isRefreshing = false;
      if (res?.accessToken) {
        // Refresh OK : on debloque les requetes en attente et on rejoue l'originale
        refreshSubject.next(res.accessToken);
        return next(addToken(originalReq, res.accessToken));
      }
      forceLogout(router);
      return throwError(() => new Error('Refresh sans accessToken'));
    }),
    catchError(refreshErr => {
      isRefreshing = false;
      // Le refresh token est invalide / expire : deconnexion definitive
      forceLogout(router);
      return throwError(() => refreshErr);
    }),
  );
}

function forceLogout(router: Router): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
  router.navigate(['/auth/login']);
}
