import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-collaborative-session',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page fade-in">
      <header class="page-head">
        <div><h2>Live Session</h2><p class="muted">Session #{{ sessionId }} · Machine Learning</p></div>
        <button class="leave">Leave session</button>
      </header>

      <div class="grid">
        <article class="card timer">
          <p class="label">Focus time</p>
          <div class="clock">{{ display }}</div>
          <div class="actions">
            <button class="btn-accent" (click)="toggle()">{{ running ? 'Pause' : 'Start' }}</button>
            <button class="btn-ghost" (click)="reset()">Reset</button>
          </div>
        </article>

        <article class="card participants">
          <h3>Participants</h3>
          <div class="list">
            <div class="p" *ngFor="let p of participants">
              <img [src]="p.avatar" [alt]="p.name"/>
              <div>
                <strong>{{ p.name }}</strong>
                <span class="muted small">{{ p.status }}</span>
              </div>
              <span class="dot" [class.on]="p.active"></span>
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; padding: 0 32px 32px; }
    .page-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 20px; }
    .page-head h2 { font-size: 28px; font-weight: 800; }
    .muted { color: var(--text-muted); } .small { font-size: 12px; }
    .leave { background: var(--coral); color: #fff; padding: 10px 18px; border-radius: 999px; font-weight: 700; font-size: 13px; }

    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    @media(max-width: 1024px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #fff; border-radius: 24px; padding: 32px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }

    .timer { text-align: center; }
    .timer .label { color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; font-size: 12px; font-weight: 700; }
    .clock { font-size: 88px; font-weight: 800; letter-spacing: -.02em; margin: 16px 0; }
    .actions { display: flex; gap: 10px; justify-content: center; }
    .btn-accent { background: var(--accent); color: #1A1A1A; padding: 12px 24px; border-radius: 999px; font-weight: 700; }
    .btn-ghost { background: var(--surface-alt); padding: 12px 24px; border-radius: 999px; font-weight: 600; }

    .participants h3 { font-size: 18px; font-weight: 700; margin-bottom: 14px; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .p { display: grid; grid-template-columns: 40px 1fr auto; gap: 12px; align-items: center; }
    .p img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    .p strong { display: block; font-size: 14px; }
    .p .dot { width: 10px; height: 10px; border-radius: 50%; background: #ccc; }
    .p .dot.on { background: var(--success); box-shadow: 0 0 0 4px rgba(91,212,154,.25); }
  `]
})
export class CollaborativeSessionComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  sessionId = this.route.snapshot.paramMap.get('sessionId') || 'ss1';

  seconds = 25 * 60;
  running = false;
  private timerId?: number;

  participants = [
    { name: 'You',   avatar: 'https://i.pravatar.cc/40?img=47', status: 'Focused',  active: true  },
    { name: 'Alice', avatar: 'https://i.pravatar.cc/40?img=5',  status: 'Focused',  active: true  },
    { name: 'Bob',   avatar: 'https://i.pravatar.cc/40?img=12', status: 'Away',     active: false },
    { name: 'Cara',  avatar: 'https://i.pravatar.cc/40?img=23', status: 'Focused',  active: true  },
  ];

  get display(): string {
    const m = Math.floor(this.seconds / 60);
    const s = this.seconds % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  ngOnInit() {}
  ngOnDestroy() { if (this.timerId) clearInterval(this.timerId); }

  toggle() {
    this.running = !this.running;
    if (this.running) {
      this.timerId = window.setInterval(() => {
        this.seconds = Math.max(0, this.seconds - 1);
        if (this.seconds === 0) { this.running = false; clearInterval(this.timerId); }
      }, 1000);
    } else if (this.timerId) { clearInterval(this.timerId); }
  }
  reset() { this.seconds = 25 * 60; this.running = false; if (this.timerId) clearInterval(this.timerId); }
}
