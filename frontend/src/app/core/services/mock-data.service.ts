import { Injectable } from '@angular/core';
import { User } from '../models/models';
import { Goal } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  readonly currentUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'guest@studyflow.io',
    firstName: 'Invite',
    lastName: '',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    name: 'Invite'
  };

  /** Placeholder pour le composant goals (sera remplace par un endpoint /api/goals) */
  readonly goals: Goal[] = [];
}
