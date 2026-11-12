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

export function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

const MASTERY_ICON: Record<Mastery, string> = { none: '○', learning: '◔', basic: '◑', proficient: '●' };

export function MasteryBadge({ mastery }: { mastery: Mastery }) {
  return (
    <span className={`badge mastery-${mastery}`}>
      {MASTERY_ICON[mastery]} {MASTERY_LABEL[mastery]}
    </span>
  );
}

const STATE_ICON: Record<AssignmentState, string> = { assigned: '•', in_progress: '▶', passed: '✔', needs_practice: '↻' };

export function StateBadge({ state }: { state: AssignmentState }) {
  return (
    <span className={`badge state-${state}`}>
      {STATE_ICON[state]} {STATE_LABEL[state]}
    </span>
  );
}

export const thaiDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
