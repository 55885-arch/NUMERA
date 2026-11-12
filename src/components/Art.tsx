/**
 * Drawn artwork for the game's "moments" (unslop direction): monsters and medals.
 * Rich colour lives here; the rest of the interface stays quiet.
 */
import { useId } from 'react';

export type MonsterKind = 'slime' | 'wisp' | 'golem' | 'sentinel' | 'drake';

export const MONSTER_NAME: Record<MonsterKind, string> = {
  slime: 'สไลม์เลขลบ',
  wisp: 'ภูตจำนวนเต็ม',
  golem: 'โกเลมตัวเลข',
  sentinel: 'Integer Sentinel',
  drake: 'Gatekeeper ผู้เฝ้าหอคอย',
};

const EYE = '#14151b';

function Eyes({ y, gap, r = 6 }: { y: number; gap: number; r?: number }) {
  return (
    <g>
      <ellipse cx={60 - gap} cy={y} rx={r} ry={r * 1.15} fill="#fff" />
      <ellipse cx={60 + gap} cy={y} rx={r} ry={r * 1.15} fill="#fff" />
      <circle cx={60 - gap + 1.5} cy={y + 1.5} r={r * 0.5} fill={EYE} />
      <circle cx={60 + gap + 1.5} cy={y + 1.5} r={r * 0.5} fill={EYE} />
      <circle cx={60 - gap + 3} cy={y - 1} r={r * 0.18} fill="#fff" />
      <circle cx={60 + gap + 3} cy={y - 1} r={r * 0.18} fill="#fff" />
    </g>
  );
}

export function Monster({ kind, size = 96, label }: { kind: MonsterKind; size?: number; label?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (n: string) => `${id}-${n}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label ?? MONSTER_NAME[kind]}>
      <defs>
        <radialGradient id={g('slime')} cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#c6e59a" />
          <stop offset="0.55" stopColor="#7fb069" />
          <stop offset="1" stopColor="#3f6b3a" />
        </radialGradient>
        <radialGradient id={g('wisp')} cx="45%" cy="30%" r="80%">
          <stop offset="0" stopColor="#e3fbf6" />
          <stop offset="0.5" stopColor="#7cc9bd" />
          <stop offset="1" stopColor="#2f6f6a" />
        </radialGradient>
        <linearGradient id={g('stone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9a39a" />
          <stop offset="1" stopColor="#5d5850" />
        </linearGradient>
        <linearGradient id={g('steel')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9d1dc" />
          <stop offset="1" stopColor="#56606f" />
        </linearGradient>
        <linearGradient id={g('drake')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9704b" />
          <stop offset="1" stopColor="#7a2e22" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="108" rx="34" ry="6" fill="#000" opacity="0.28" />

      {kind === 'slime' && (
        <g>
          <path d="M20 100 C14 70 32 34 60 34 C88 34 106 70 100 100 Z" fill={`url(#${g('slime')})`} />
          <path d="M30 52 C36 42 46 38 54 38" stroke="#eaf7d4" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
          <Eyes y={66} gap={14} />
          <path d="M52 84 Q60 90 68 84" stroke={EYE} strokeWidth="3" strokeLinecap="round" fill="none" />
          <text x="60" y="58" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#2b4a27" opacity="0.8">−1</text>
        </g>
      )}

      {kind === 'wisp' && (
        <g>
          <path d="M28 98 C24 60 36 24 60 24 C84 24 96 60 92 98 L82 90 L72 100 L60 90 L48 100 L38 90 Z" fill={`url(#${g('wisp')})`} />
          <path d="M40 40 C44 32 52 28 58 28" stroke="#f3fffc" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
          <Eyes y={58} gap={12} r={5.5} />
          <ellipse cx="60" cy="76" rx="6" ry="4" fill={EYE} />
        </g>
      )}

      {kind === 'golem' && (
        <g>
          <rect x="22" y="38" width="76" height="66" rx="12" fill={`url(#${g('stone')})`} />
          <rect x="34" y="20" width="52" height="24" rx="8" fill="#b9b3a9" />
          <path d="M30 60 L44 64 M78 82 L92 76 M40 94 L52 90" stroke="#4a463f" strokeWidth="2" strokeLinecap="round" />
          <Eyes y={62} gap={14} />
          <rect x="48" y="82" width="24" height="4" rx="2" fill={EYE} />
          <text x="60" y="38" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fontWeight="600" fill="#3d3a34">−7</text>
        </g>
      )}

      {kind === 'sentinel' && (
        <g>
          <path d="M60 14 L98 30 L94 72 C90 92 76 102 60 108 C44 102 30 92 26 72 L22 30 Z" fill={`url(#${g('steel')})`} />
          <path d="M60 22 L90 35 L87 70 C84 86 73 95 60 100 Z" fill="#fff" opacity="0.12" />
          <rect x="34" y="50" width="52" height="14" rx="4" fill="#1d222b" />
          <circle cx="48" cy="57" r="3.5" fill="#e8a33d" />
          <circle cx="72" cy="57" r="3.5" fill="#e8a33d" />
          <text x="60" y="88" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="14" fontWeight="600" fill="#2a303a">±</text>
        </g>
      )}

      {kind === 'drake' && (
        <g>
          <path d="M30 36 L22 14 L42 30 Z M90 36 L98 14 L78 30 Z" fill="#5a2018" />
          <path d="M18 92 C12 60 30 30 60 30 C90 30 108 60 102 92 C96 104 80 106 60 106 C40 106 24 104 18 92 Z" fill={`url(#${g('drake')})`} />
          <path d="M34 50 C40 40 50 36 58 36" stroke="#f3b394" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M40 60 L54 66 L40 70 Z M80 60 L66 66 L80 70 Z" fill="#ffd27a" />
          <path d="M44 86 L50 80 L56 86 L62 80 L68 86 L74 80 L78 86" stroke="#fff1e6" strokeWidth="3" strokeLinejoin="round" fill="none" />
          <text x="60" y="56" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#3a120d" opacity="0.8">x²</text>
        </g>
      )}
    </svg>
  );
}

export type MedalTier = 'gold' | 'silver' | 'bronze';

const METAL: Record<MedalTier, [string, string, string]> = {
  gold: ['#fff1c2', '#e8b33d', '#8a5a12'],
  silver: ['#ffffff', '#c3c8d1', '#6b7280'],
  bronze: ['#f6d2b3', '#c27a45', '#6e3d1d'],
};

export function Medal({ tier, size = 96 }: { tier: MedalTier; size?: number }) {
  const id = useId().replace(/:/g, '');
  const [light, mid, dark] = METAL[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`เหรียญ ${tier}`}>
      <defs>
        <radialGradient id={`${id}-m`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
      </defs>
      <path d="M38 6 H58 L66 46 H46 Z" fill="#2b3446" />
      <path d="M82 6 H62 L54 46 H74 Z" fill="#3a465c" />
      <circle cx="60" cy="74" r="38" fill={dark} />
      <circle cx="60" cy="74" r="34" fill={`url(#${id}-m)`} />
      <circle cx="60" cy="74" r="25" fill="none" stroke={dark} strokeOpacity="0.45" strokeWidth="2" />
      <path d="M60 56 L65.5 67.5 L78 69 L68.8 77.6 L71.2 90 L60 84 L48.8 90 L51.2 77.6 L42 69 L54.5 67.5 Z" fill={dark} fillOpacity="0.55" />
    </svg>
  );
}
