export type { User, Role } from './models';

import type { User } from './models';

export interface AuthCredentials { email: string; password: string; }

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
  user: User;
  token?: string;
}
