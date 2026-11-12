/** Seeded random numbers, so the same seed always gives the same questions
 * (needed for worksheets, dungeon resume and tests). */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

/** Random integer in [min, max] that is not 0. */
export function nonZero(rng: Rng, min: number, max: number): number {
  let n = 0;
  while (n === 0) n = randInt(rng, min, max);
  return n;
}

export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);
