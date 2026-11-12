import { describe, expect, it } from 'vitest';
import { checkAnswer, generateQuestion, generateSet, parseIntegerAnswer, TIERS, templatesFor } from './index';

// Independent check: evaluate the plain arithmetic expression.
const evaluate = (expr: string): number => {
  expect(expr).toMatch(/^[\d\s+\-*/().]+$/);
  return Function(`"use strict"; return (${expr});`)() as number;
};

describe('question engine: integers', () => {
  for (const tier of TIERS) {
    it(`tier ${tier}: 500 generated questions all have correct answers`, () => {
      for (let seed = 0; seed < 500; seed++) {
        const q = generateQuestion('INT', tier, seed);
        expect(Number.isInteger(q.answer), q.prompt).toBe(true);
        expect(evaluate(q.expression), q.prompt).toBe(q.answer);
        expect(q.hints).toHaveLength(3);
        expect(q.solution.join(' '), q.prompt).toContain(String(q.answer));
        // hints 1-2 must not give the final answer away ("|-27| = 27" is fine, it is a step)
        const givesAnswer = new RegExp(`= ${q.answer}(?!\\d)`);
        for (const hint of q.hints.slice(0, 2)) {
          expect(hint.replace(/\|-?\d+\| = \d+/g, ''), q.prompt).not.toMatch(givesAnswer);
        }
        for (const m of q.mistakes) expect(m.value).not.toBe(q.answer);
      }
    });
  }

  it('every tier has at least two question types', () => {
    for (const tier of TIERS) expect(templatesFor('INT', tier).length).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic for the same seed', () => {
    expect(generateQuestion('INT', 2, 42)).toEqual(generateQuestion('INT', 2, 42));
  });

  it('worksheet sets have no duplicate questions', () => {
    const set = generateSet('INT', 1, 15, 7);
    expect(set).toHaveLength(15);
    expect(new Set(set.map((q) => q.key)).size).toBe(15);
  });
});

describe('answer checking', () => {
  it('accepts common ways of writing integers', () => {
    expect(parseIntegerAnswer('-5')).toBe(-5);
    expect(parseIntegerAnswer(' - 5 ')).toBe(-5);
    expect(parseIntegerAnswer('(-5)')).toBe(-5);
    expect(parseIntegerAnswer('−5')).toBe(-5);
    expect(parseIntegerAnswer('+5')).toBe(5);
    expect(parseIntegerAnswer('1,200')).toBe(1200);
    expect(parseIntegerAnswer('-0')).toBe(0);
  });

  it('rejects non-integers', () => {
    for (const bad of ['', 'abc', '5.5', '--5', '5-', '(5']) expect(parseIntegerAnswer(bad)).toBeNull();
  });

  it('recognises a known misconception', () => {
    const q = generateQuestion('INT', 1, 3);
    expect(checkAnswer(q, String(q.answer)).status).toBe('correct');
    expect(checkAnswer(q, 'x').status).toBe('invalid');
    const m = q.mistakes[0];
    const r = checkAnswer(q, String(m.value));
    expect(r).toEqual({ status: 'wrong', value: m.value, mistake: m.message });
  });
});
