import type { ReactNode } from 'react';
import { MASTERY_LABEL, type Mastery } from '../game/rules';
import { STATE_LABEL, type AssignmentState } from '../data/store';

export const go = (path: string) => {
  window.location.hash = path;
};

export function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={`#${to}`} className={className}>
      {children}
    </a>
  );
}

export function Bar({ value, max, label, tone }: { value: number; max: number; label: string; tone?: 'accent' | 'bad' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`bar ${tone ?? ''}`} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

const MASTERY_STEPS: Record<Mastery, number> = { none: 0, learning: 1, basic: 2, proficient: 4 };

/** Four small steps plus the label, so the level reads without relying on colour. */
export function MasteryBadge({ mastery }: { mastery: Mastery }) {
  const on = MASTERY_STEPS[mastery];
  return (
    <span className="badge">
      <span className="meter" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < on ? 'on' : ''} />
        ))}
      </span>
      {MASTERY_LABEL[mastery]}
    </span>
  );
}

export function StateBadge({ state, extra }: { state: AssignmentState; extra?: string }) {
  return (
    <span className={`badge state-${state}`}>
      <span className="dot" aria-hidden />
      {STATE_LABEL[state]}
      {extra && <span className="muted mono small">{extra}</span>}
    </span>
  );
}

export const thaiDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Ring showing progress to the next level, with the level number in the middle. */
export function LevelRing({ level, into, need, size = 96 }: { level: number; into: number; need: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = need > 0 ? into / need : 0;
  return (
    <div className="level-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="4" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="level-num">
        <div>
          <span className="small muted">Lv.</span>
          <br />
          <strong>{level}</strong>
        </div>
      </div>
    </div>
  );
}
