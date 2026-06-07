(globalThis as any).global = globalThis;
(window as any).global = window;
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(AppComponent, appConfig).catch(console.error);