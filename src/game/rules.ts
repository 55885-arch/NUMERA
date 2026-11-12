/**
 * Game rules from the proposal. Kept as plain functions so they can be tested
 * and later moved to the server (Supabase Edge Function) unchanged.
 */
import type { Tier } from '../engine';

export const TIER_EXP: Record<Tier, number> = { 1: 10, 2: 15, 3: 20, 4: 30 };

/**
 * EXP for one correct answer.
 * - First time a question is solved: full EXP (70% if hints were used).
 * - Repeating an already-solved question: 20%, and nothing after 3 repeats (anti-farming).
 * Wrong answers give 0 but never remove EXP.
 */
export function expForCorrect(tier: Tier, timesSolvedBefore: number, hintsUsed: number): number {
  const base = TIER_EXP[tier];
  if (timesSolvedBefore >= 3) return 0;
  if (timesSolvedBefore > 0) return Math.max(1, Math.round(base * 0.2));
  return hintsUsed > 0 ? Math.round(base * 0.7) : base;
}

/** Total EXP needed to reach a level: L1 = 0, L2 = 50, L3 = 150, L4 = 300, ... */
export const expToReach = (level: number) => 25 * level * (level - 1);

export function levelInfo(exp: number) {
  let level = 1;
  while (exp >= expToReach(level + 1)) level++;
  const from = expToReach(level);
  const to = expToReach(level + 1);
  return { level, exp, into: exp - from, need: to - from };
}

/** Free Field: Character Level decides the question Tier (proposal §4.6). */
export function freeFieldTier(level: number): Tier {
  if (level <= 5) return 1;
  if (level <= 10) return 2;
  if (level <= 15) return 3;
  return 4;
}

export function titleFor(level: number): string {
  if (level <= 5) return 'นักผจญภัยฝึกหัด';
  if (level <= 10) return 'นักเวทตัวเลข';
  if (level <= 15) return 'จอมเวทจำนวนเต็ม';
  return 'ปราชญ์แห่ง NUMERA';
}

export type Mastery = 'none' | 'learning' | 'basic' | 'proficient';

export const MASTERY_LABEL: Record<Mastery, string> = {
  none: 'ยังไม่เริ่ม',
  learning: 'กำลังฝึก',
  basic: 'ผ่านพื้นฐาน',
  proficient: 'ชำนาญ',
};

export interface AnswerRecord {
  templateId: string;
  tier: Tier;
  correct: boolean;
}

/**
 * Topic Mastery (proposal §4.4, default values the teacher can change later):
 * - learning:   has started
 * - basic:      at least 4 of the last 5 answers correct
 * - proficient: basic, and 80%+ of the last 10 correct, and correct answers on
 *               at least 3 different question types at Tier 2 or higher
 */
export function masteryOf(answers: AnswerRecord[]): Mastery {
  if (answers.length === 0) return 'none';
  const last5 = answers.slice(-5);
  const basic = last5.length === 5 && last5.filter((a) => a.correct).length >= 4;
  if (!basic) return 'learning';
  const last10 = answers.slice(-10);
  const accuracy10 = last10.filter((a) => a.correct).length / last10.length;
  const types = new Set(answers.slice(-15).filter((a) => a.correct && a.tier >= 2).map((a) => a.templateId));
  return last10.length === 10 && accuracy10 >= 0.8 && types.size >= 3 ? 'proficient' : 'basic';
}

/** Dungeon rooms climb in Tier up to the teacher's max Tier; the boss uses the max Tier. */
export function roomTiers(maxTier: Tier, rooms: number): Tier[] {
  const tiers: Tier[] = [];
  for (let i = 0; i < rooms; i++) tiers.push(Math.max(1, maxTier - (rooms - 1 - i)) as Tier);
  tiers.push(maxTier);
  return tiers;
}
