import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environements/environment';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = environment.apiUrl + '/users/me';
  private http = inject(HttpClient);

  me(): Observable<User> {
    return this.http.get<User>(this.base);
  }

  update(firstName: string, lastName: string, email?: string): Observable<User> {
    const body: any = { firstName, lastName };
    if (email && email.trim()) body.email = email.trim();
    return this.http.put<User>(this.base, body);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/password`, { currentPassword, newPassword });
  }
}
