import type { Rng } from './random';

export type Tier = 1 | 2 | 3 | 4;
export const TIERS: Tier[] = [1, 2, 3, 4];

export const TIER_LABEL: Record<Tier, string> = {
  1: 'T1 Familiar',
  2: 'T2 Practice',
  3: 'T3 Apply',
  4: 'T4 Mastery',
};

/** A wrong answer we can recognise, with a message explaining the misconception. */
export interface Mistake {
  value: number;
  message: string;
}

export interface Question {
  /** Same numbers + same template = same key. Used for anti-farming. */
  key: string;
  templateId: string;
  topicId: string;
  tier: Tier;
  prompt: string;
  /** Plain arithmetic (e.g. "-8 + (13)") used by tests to double-check the answer. */
  expression: string;
  answer: number;
  /** Hint 1: concept, Hint 2: step, Hint 3: similar worked example. */
  hints: [string, string, string];
  /** Full worked solution, shown after the third hint is used up. */
  solution: string[];
  mistakes: Mistake[];
}

export type QuestionBody = Omit<Question, 'key' | 'templateId' | 'topicId' | 'tier'> & {
  /** Extra text for the key when two contexts share the same arithmetic. */
  variant?: string;
};

export interface Template {
  id: string;
  name: string;
  tiers: Tier[];
  generate(rng: Rng, tier: Tier): QuestionBody;
}

export interface Topic {
  id: string;
  name: string;
  grade: string;
  strand: string;
  /** Curriculum reference. The teacher must confirm it before use. */
  standardRef: string;
  templates: Template[];
}
