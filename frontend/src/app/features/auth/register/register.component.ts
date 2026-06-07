import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;

  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  shakeForm = false;

  emailValid: boolean | null = null;
  passwordStrength = 0;
  passwordHint = '';

  get passwordsMatch(): boolean {
    return this.confirmPassword.length > 0 && this.password === this.confirmPassword;
  }

  get confirmPasswordInvalid(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  validateEmail(): void {
    if (!this.email) {
      this.emailValid = null;
      return;
    }

    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.emailValid = re.test(this.email.trim());
  }

  validatePassword(): void {
    const value = this.password;
    if (!value) {
      this.passwordStrength = 0;
      this.passwordHint = '';
      return;
    }

    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    this.passwordStrength = score;
    const hints = ['Too short', 'Weak - add uppercase or numbers', 'Medium', 'Strong'];
    this.passwordHint = hints[score - 1] ?? 'Too short';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  register(): void {
    this.validateEmail();
    this.validatePassword();

    if (!this.name.trim() || !this.email.trim() || !this.password.trim() || !this.confirmPassword.trim()) {
      this.showError('Please fill in all fields.');
      return;
    }

    if (this.emailValid === false) {
      this.showError('Please enter a valid email address.');
      return;
    }

    if (this.password.length < 6) {
      this.showError('Use at least 6 characters for your password.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showError('Passwords do not match.');
      return;
    }

    if (!this.acceptTerms) {
      this.showError('Please accept the terms before creating your account.');
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    this.auth
      .register({
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          const target = res.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
          this.router.navigate([target]);
        },
        error: () => {
          this.showError('Registration is unavailable right now.');
        },
      });
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.triggerShake();
  }

  private triggerShake(): void {
    this.shakeForm = true;
    setTimeout(() => (this.shakeForm = false), 500);
  }
}
