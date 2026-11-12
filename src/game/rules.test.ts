import { describe, expect, it } from 'vitest';
import { expForCorrect, freeFieldTier, levelInfo, masteryOf, roomTiers, type AnswerRecord } from './rules';

describe('EXP and anti-farming', () => {
  it('gives full EXP first time, less with hints, little for repeats, none after 3 repeats', () => {
    expect(expForCorrect(2, 0, 0)).toBe(15);
    expect(expForCorrect(2, 0, 2)).toBe(11);
    expect(expForCorrect(2, 1, 0)).toBe(3);
    expect(expForCorrect(2, 3, 0)).toBe(0);
  });
});

describe('levels', () => {
  it('computes level from EXP', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(49).level).toBe(1);
    expect(levelInfo(50).level).toBe(2);
    expect(levelInfo(150)).toEqual({ level: 3, exp: 150, into: 0, need: 150 });
  });

  it('maps Character Level to Free Field tier', () => {
    expect([1, 5, 6, 10, 11, 15, 16, 30].map(freeFieldTier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('mastery', () => {
  const rec = (correct: boolean, templateId = 'A', tier: 1 | 2 = 1): AnswerRecord => ({ correct, templateId, tier });

  it('needs 4 of the last 5 for basic', () => {
    expect(masteryOf([])).toBe('none');
    expect(masteryOf([rec(true), rec(true), rec(true)])).toBe('learning');
    expect(masteryOf([rec(true), rec(false), rec(true), rec(true), rec(true)])).toBe('basic');
    expect(masteryOf([rec(true), rec(false), rec(false), rec(true), rec(true)])).toBe('learning');
  });

  it('needs varied question types for proficient', () => {
    const same = Array.from({ length: 10 }, () => rec(true, 'A', 2));
    expect(masteryOf(same)).toBe('basic');
    const varied = Array.from({ length: 10 }, (_, i) => rec(true, ['A', 'B', 'C'][i % 3], 2));
    expect(masteryOf(varied)).toBe('proficient');
  });
});

describe('dungeon rooms', () => {
  it('climbs tiers up to the teacher max, boss at max', () => {
    expect(roomTiers(3, 3)).toEqual([1, 2, 3, 3]);
    expect(roomTiers(2, 3)).toEqual([1, 1, 2, 2]);
    expect(roomTiers(1, 3)).toEqual([1, 1, 1, 1]);
  });
});
