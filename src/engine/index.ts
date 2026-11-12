import { INTEGERS } from './integers';
import { mulberry32, pick } from './random';
import type { Question, Template, Tier, Topic } from './types';

export * from './types';
export { newSeed } from './random';

export const TOPICS: Topic[] = [INTEGERS];

export function getTopic(topicId: string): Topic {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) throw new Error(`Unknown topic ${topicId}`);
  return topic;
}

export function templatesFor(topicId: string, tier: Tier): Template[] {
  return getTopic(topicId).templates.filter((t) => t.tiers.includes(tier));
}

export function templateName(topicId: string, templateId: string): string {
  return getTopic(topicId).templates.find((t) => t.id === templateId)?.name ?? templateId;
}

/** Same (topic, tier, seed) always gives the same question. */
export function generateQuestion(topicId: string, tier: Tier, seed: number): Question {
  const rng = mulberry32(seed);
  const template = pick(rng, templatesFor(topicId, tier));
  const { variant, ...body } = template.generate(rng, tier);
  return {
    ...body,
    key: `${template.id}:${variant ?? ''}:${body.expression}`,
    templateId: template.id,
    topicId,
    tier,
  };
}

/** A set of questions with no duplicates (used for worksheets). */
export function generateSet(topicId: string, tier: Tier, count: number, seed: number): Question[] {
  const out: Question[] = [];
  const keys = new Set<string>();
  for (let i = 0; out.length < count && i < count * 50; i++) {
    const q = generateQuestion(topicId, tier, seed * 997 + i);
    if (!keys.has(q.key)) {
      keys.add(q.key);
      out.push(q);
    }
  }
  return out;
}

/** Accepts "-5", " - 5 ", "(-5)", "−5" (unicode minus), "+5". Returns null if not an integer. */
export function parseIntegerAnswer(raw: string): number | null {
  let s = raw.trim().replace(/[\s,]/g, '').replace(/[−–—]/g, '-');
  while (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n + 0 : null; // + 0 turns -0 into 0
}

export type CheckResult =
  | { status: 'invalid' }
  | { status: 'correct'; value: number }
  | { status: 'wrong'; value: number; mistake?: string };

export function checkAnswer(q: Question, raw: string): CheckResult {
  const value = parseIntegerAnswer(raw);
  if (value === null) return { status: 'invalid' };
  if (value === q.answer) return { status: 'correct', value };
  return { status: 'wrong', value, mistake: q.mistakes.find((m) => m.value === value)?.message };
}
