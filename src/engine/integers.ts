/**
 * Topic: จำนวนเต็ม (Integers), ม.1
 * Question text is written new for NUMERA (not copied from textbooks).
 * The teacher must review templates before classroom use.
 */
import { nonZero, pick, randInt, type Rng } from './random';
import type { Mistake, Template, Tier, Topic } from './types';

const abs = Math.abs;
/** Put negatives in parentheses when they are not the first term: 5 + (-3). */
export const p = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const signWord = (n: number) => (n < 0 ? 'ลบ' : 'บวก');

function uniqueMistakes(answer: number, list: Mistake[]): Mistake[] {
  const seen = new Set<number>([answer]);
  return list.filter((m) => {
    if (seen.has(m.value)) return false;
    seen.add(m.value);
    return true;
  });
}

const SIGN_MISTAKE = 'ขนาดของคำตอบถูกแล้ว แต่เครื่องหมายผิด ลองตรวจเครื่องหมายอีกครั้ง';

// ---------------------------------------------------------------- addition

/** Two non-zero integers, at least one negative, never opposites (so the answer is not 0). */
function pairWithNegative(rng: Rng, r: number): [number, number] {
  for (;;) {
    const a = nonZero(rng, -r, r);
    const b = nonZero(rng, -r, r);
    if ((a < 0 || b < 0) && a !== -b) return [a, b];
  }
}

function addSteps(a: number, b: number) {
  const ans = a + b;
  const same = a < 0 === b < 0;
  if (same) {
    return {
      ans,
      same,
      concept: 'ทั้งสองจำนวนมีเครื่องหมายเหมือนกัน: นำค่าสัมบูรณ์มาบวกกัน แล้วใส่เครื่องหมายเดิม',
      step: `|${a}| = ${abs(a)} และ |${b}| = ${abs(b)} ลองนำมาบวกกัน แล้วใส่เครื่องหมาย${signWord(a)}`,
      lines: [`${a} + ${p(b)}`, `= ${a < 0 ? '-' : ''}(${abs(a)} + ${abs(b)})`, `= ${ans}`],
    };
  }
  const big = abs(a) > abs(b) ? a : b;
  const small = big === a ? b : a;
  return {
    ans,
    same,
    concept:
      'สองจำนวนมีเครื่องหมายต่างกัน: นำค่าสัมบูรณ์มาลบกัน (มากลบน้อย) แล้วใส่เครื่องหมายของจำนวนที่มีค่าสัมบูรณ์มากกว่า',
    step: `|${a}| = ${abs(a)} และ |${b}| = ${abs(b)} จำนวนที่มีค่าสัมบูรณ์มากกว่าคือ ${big} คำตอบจึงเป็นจำนวน${signWord(big)}`,
    lines: [`${a} + ${p(b)}`, `= ${big < 0 ? '-' : ''}(${abs(big)} - ${abs(small)})`, `= ${ans}`],
  };
}

const R: Record<Tier, number> = { 1: 10, 2: 30, 3: 60, 4: 120 };

const add: Template = {
  id: 'INT_ADD',
  name: 'การบวกจำนวนเต็ม',
  tiers: [1, 2],
  generate(rng, tier) {
    const [a, b] = pairWithNegative(rng, R[tier]);
    const s = addSteps(a, b);
    let ex = s;
    while (ex === s || ex.same !== s.same) ex = addSteps(...pairWithNegative(rng, R[tier]));
    return {
      prompt: `คำนวณ ${a} + ${p(b)}`,
      expression: `${a} + (${b})`,
      answer: s.ans,
      hints: [s.concept, s.step, `ตัวอย่างใกล้เคียง: ${ex.lines.join(' ')}`],
      solution: s.lines,
      mistakes: uniqueMistakes(s.ans, [
        { value: -s.ans, message: SIGN_MISTAKE },
        ...(s.same
          ? []
          : [
              {
                value: Math.sign(s.ans) * (abs(a) + abs(b)),
                message: 'เมื่อเครื่องหมายต่างกัน ต้องนำค่าสัมบูรณ์มาลบกัน ไม่ใช่บวกกัน',
              },
            ]),
      ]),
    };
  },
};

// ---------------------------------------------------------------- subtraction

function subParts(rng: Rng, r: number) {
  for (;;) {
    const a = nonZero(rng, -r, r);
    const b = nonZero(rng, -r, r);
    // keep it about negatives: a negative number involved, or a negative result
    if (a === b || (a > 0 && b > 0 && a > b)) continue;
    const s = addSteps(a, -b);
    return { a, b, s, lines: [`${a} - ${p(b)}`, `= ${a} + ${p(-b)}`, ...s.lines.slice(1)] };
  }
}

const sub: Template = {
  id: 'INT_SUB',
  name: 'การลบจำนวนเต็ม',
  tiers: [1, 2, 3],
  generate(rng, tier) {
    const { a, b, s, lines } = subParts(rng, R[tier]);
    const ex = subParts(rng, R[tier]);
    return {
      prompt: `คำนวณ ${a} - ${p(b)}`,
      expression: `${a} - (${b})`,
      answer: s.ans,
      hints: [
        'การลบจำนวนเต็ม: เปลี่ยนเป็นการบวกด้วยจำนวนตรงข้าม  a - b = a + (-b)',
        `เขียนใหม่เป็น ${a} + ${p(-b)} แล้วใช้หลักการบวกจำนวนเต็ม`,
        `ตัวอย่างใกล้เคียง: ${ex.lines.join(' ')}`,
      ],
      solution: lines,
      mistakes: uniqueMistakes(s.ans, [
        ...(b < 0
          ? [
              {
                value: a + b,
                message: 'การลบด้วยจำนวนลบ เท่ากับการบวกด้วยจำนวนบวก เช่น 5 - (-3) = 5 + 3',
              },
            ]
          : []),
        { value: -s.ans, message: SIGN_MISTAKE },
      ]),
    };
  },
};

// ---------------------------------------------------------------- multiply / divide

const MR: Record<Tier, number> = { 1: 9, 2: 12, 3: 20, 4: 25 };

function mulDivParts(rng: Rng, r: number, isDiv: boolean) {
  let a = 0;
  let b = 0;
  while (a === 0 || (a > 0 && b > 0) || abs(a) === 1 || abs(b) === 1) {
    a = nonZero(rng, -r, r);
    b = nonZero(rng, -r, r);
  }
  const x = isDiv ? a * b : a; // dividend or first factor
  const ans = isDiv ? a : a * b;
  const op = isDiv ? '÷' : '×';
  const same = x < 0 === b < 0;
  return {
    x,
    b,
    ans,
    op,
    same,
    lines: [
      `${x} ${op} ${p(b)}`,
      `= ${same ? '' : '-'}(${abs(x)} ${op} ${abs(b)})   เพราะเครื่องหมาย${same ? 'เหมือนกัน ผลเป็นบวก' : 'ต่างกัน ผลเป็นลบ'}`,
      `= ${ans}`,
    ],
  };
}

const mulDiv: Template = {
  id: 'INT_MULDIV',
  name: 'การคูณและการหารจำนวนเต็ม',
  tiers: [1, 2, 3],
  generate(rng, tier) {
    const isDiv = rng() < 0.5;
    const m = mulDivParts(rng, MR[tier], isDiv);
    const ex = mulDivParts(rng, MR[tier], isDiv);
    return {
      prompt: `คำนวณ ${m.x} ${m.op} ${p(m.b)}`,
      expression: `${m.x} ${isDiv ? '/' : '*'} (${m.b})`,
      answer: m.ans,
      hints: [
        'กฎเครื่องหมาย: เครื่องหมายเหมือนกัน ผลลัพธ์เป็นบวก / เครื่องหมายต่างกัน ผลลัพธ์เป็นลบ',
        `${isDiv ? 'หาร' : 'คูณ'}ค่าสัมบูรณ์ก่อน: ${abs(m.x)} ${m.op} ${abs(m.b)} แล้วดูว่า ${m.x} กับ ${m.b} มีเครื่องหมายเหมือนหรือต่างกัน`,
        `ตัวอย่างใกล้เคียง: ${ex.lines.join(' ')}`,
      ],
      solution: m.lines,
      mistakes: uniqueMistakes(m.ans, [{ value: -m.ans, message: SIGN_MISTAKE }]),
    };
  },
};

// ---------------------------------------------------------------- three terms

type Op = '+' | '-';
const apply = (x: number, op: Op, y: number) => (op === '+' ? x + y : x - y);

function threeParts(rng: Rng, r: number) {
  for (;;) {
    const a = nonZero(rng, -r, r);
    const b = nonZero(rng, -r, r);
    const c = nonZero(rng, -r, r);
    if (a > 0 && b > 0 && c > 0) continue;
    const o1 = pick(rng, ['+', '-'] as const);
    const o2 = pick(rng, ['+', '-'] as const);
    const first = apply(a, o1, b);
    const ans = apply(first, o2, c);
    const text = `${a} ${o1} ${p(b)} ${o2} ${p(c)}`;
    return {
      a, b, c, o1, o2, first, ans, text,
      wrongOrder: apply(a, o1, apply(b, o2, c)),
      lines: [text, `= ${first} ${o2} ${p(c)}`, `= ${ans}`],
    };
  }
}

const threeTerms: Template = {
  id: 'INT_THREE',
  name: 'การบวกลบจำนวนเต็มหลายจำนวน',
  tiers: [2, 3],
  generate(rng, tier) {
    const t = threeParts(rng, tier === 2 ? 20 : 50);
    const ex = threeParts(rng, tier === 2 ? 20 : 50);
    return {
      prompt: `คำนวณ ${t.text}`,
      expression: `${t.a} ${t.o1} (${t.b}) ${t.o2} (${t.c})`,
      answer: t.ans,
      hints: [
        'คำนวณจากซ้ายไปขวาทีละคู่ และเปลี่ยนการลบเป็นการบวกด้วยจำนวนตรงข้าม',
        `เริ่มจากคู่แรก: ${t.a} ${t.o1} ${p(t.b)} ได้เท่าไร? จากนั้นนำผลไป${t.o2 === '+' ? 'บวก' : 'ลบ'}ด้วย ${p(t.c)}`,
        `ตัวอย่างใกล้เคียง: ${ex.lines.join(' ')}`,
      ],
      solution: t.lines,
      mistakes: uniqueMistakes(t.ans, [
        { value: t.wrongOrder, message: 'ต้องคำนวณจากซ้ายไปขวา ไม่ควรเริ่มจากคู่หลังก่อน' },
        { value: -t.ans, message: SIGN_MISTAKE },
      ]),
    };
  },
};

// ---------------------------------------------------------------- order of operations

type Form = 'a+bc' | 'a-bc' | '(a+b)c' | 'ab+c/d' | '(a-b)/c';

interface FormParts {
  prompt: string;
  expression: string;
  ans: number;
  lines: string[];
  step: string;
  mistakes: Mistake[];
}

function makeForm(rng: Rng, form: Form): FormParts {
  const small = () => nonZero(rng, -9, 9);
  const notOne = () => {
    let n = 1;
    while (abs(n) === 1) n = small();
    return n;
  };
  switch (form) {
    case 'a+bc':
    case 'a-bc': {
      const a = nonZero(rng, -20, 20);
      const b = small();
      const c = notOne();
      const op = form === 'a+bc' ? '+' : '-';
      const prod = b * c;
      const ans = apply(a, op, prod);
      const prompt = `${a} ${op} ${p(b)} × ${p(c)}`;
      return {
        prompt,
        expression: `${a} ${op} (${b}) * (${c})`,
        ans,
        lines: [prompt, `= ${a} ${op} ${p(prod)}`, `= ${ans}`],
        step: `ขั้นแรก คำนวณ ${p(b)} × ${p(c)} ก่อน`,
        mistakes: [{ value: apply(a, op, b) * c, message: `ต้องคูณก่อน${op === '+' ? 'บวก' : 'ลบ'} (ลำดับการคำนวณ)` }],
      };
    }
    case '(a+b)c': {
      const a = nonZero(rng, -15, 15);
      let b = nonZero(rng, -15, 15);
      while (b === -a) b = nonZero(rng, -15, 15);
      const c = notOne();
      const sum = a + b;
      const ans = sum * c;
      const prompt = `(${a} + ${p(b)}) × ${p(c)}`;
      return {
        prompt,
        expression: `(${a} + (${b})) * (${c})`,
        ans,
        lines: [prompt, `= ${p(sum)} × ${p(c)}`, `= ${ans}`],
        step: `ขั้นแรก คำนวณในวงเล็บ ${a} + ${p(b)} ก่อน`,
        mistakes: [{ value: a + b * c, message: 'ต้องคำนวณในวงเล็บก่อน' }],
      };
    }
    case 'ab+c/d': {
      const a = nonZero(rng, -12, 12);
      const b = notOne();
      const d = notOne();
      const q = nonZero(rng, -9, 9);
      const c = q * d;
      const ans = a * b + q;
      const prompt = `${a} × ${p(b)} + ${p(c)} ÷ ${p(d)}`;
      return {
        prompt,
        expression: `${a} * (${b}) + (${c}) / (${d})`,
        ans,
        lines: [prompt, `= ${p(a * b)} + ${p(q)}`, `= ${ans}`],
        step: `คำนวณ ${a} × ${p(b)} และ ${p(c)} ÷ ${p(d)} แยกกันก่อน แล้วค่อยนำผลมาบวกกัน`,
        mistakes: [],
      };
    }
    case '(a-b)/c': {
      const c = notOne();
      const q = nonZero(rng, -12, 12);
      const diff = q * c;
      const b = nonZero(rng, -20, 20);
      const a = diff + b;
      const prompt = `(${a} - ${p(b)}) ÷ ${p(c)}`;
      const wrong = (a + b) % c === 0 ? [{ value: (a + b) / c, message: 'ในวงเล็บ การลบด้วยจำนวนลบต้องเปลี่ยนเป็นการบวกจำนวนตรงข้าม' }] : [];
      return {
        prompt,
        expression: `(${a} - (${b})) / (${c})`,
        ans: q,
        lines: [prompt, `= ${p(diff)} ÷ ${p(c)}`, `= ${q}`],
        step: `คำนวณในวงเล็บก่อน: ${a} - ${p(b)} (ระวังการลบจำนวนลบ)`,
        mistakes: b < 0 ? wrong : [],
      };
    }
  }
}

const orderOps: Template = {
  id: 'INT_ORDER',
  name: 'ลำดับการคำนวณจำนวนเต็ม',
  tiers: [3, 4],
  generate(rng, tier) {
    const forms: Form[] = tier === 3 ? ['a+bc', 'a-bc', '(a+b)c'] : ['ab+c/d', '(a-b)/c', 'a-bc'];
    const form = pick(rng, forms);
    const f = makeForm(rng, form);
    const ex = makeForm(rng, form);
    return {
      prompt: `คำนวณ ${f.prompt}`,
      expression: f.expression,
      answer: f.ans,
      hints: [
        'ลำดับการคำนวณ: วงเล็บ → คูณ/หาร (ซ้ายไปขวา) → บวก/ลบ (ซ้ายไปขวา)',
        f.step,
        `ตัวอย่างใกล้เคียง: ${ex.lines.join(' ')}`,
      ],
      solution: f.lines,
      mistakes: uniqueMistakes(f.ans, [...f.mistakes, { value: -f.ans, message: SIGN_MISTAKE }]),
    };
  },
};

// ---------------------------------------------------------------- word problems

type Ctx = 'temp' | 'diver' | 'quiz';

interface WordParts {
  prompt: string;
  expression: string;
  shown: string;
  ans: number;
  lines: string[];
  mistakes: Mistake[];
}

function makeWord(rng: Rng, ctx: Ctx, big: boolean): WordParts {
  const k = big ? 2 : 1;
  switch (ctx) {
    case 'temp': {
      const t0 = randInt(rng, -12 * k, 3);
      const up = randInt(rng, 4, 12 * k);
      const down = randInt(rng, 5, 15 * k);
      const ans = t0 + up - down;
      const shown = `${t0} + ${up} - ${down}`;
      return {
        prompt: `ตอนเช้าอุณหภูมิบนยอดดอยเท่ากับ ${t0} °C ตอนบ่ายอุณหภูมิสูงขึ้น ${up} °C และตอนกลางคืนลดลง ${down} °C อุณหภูมิตอนกลางคืนเป็นกี่องศาเซลเซียส`,
        expression: `${t0} + ${up} - ${down}`,
        shown,
        ans,
        lines: [`ประโยคสัญลักษณ์: ${shown}`, `= ${t0 + up} - ${down}`, `= ${ans}`, `ตอบ อุณหภูมิตอนกลางคืนเท่ากับ ${ans} °C`],
        mistakes: [{ value: t0 - up + down, message: 'สูงขึ้นหมายถึงบวก ลดลงหมายถึงลบ ลองตรวจทิศทางอีกครั้ง' }],
      };
    }
    case 'diver': {
      const d1 = randInt(rng, 3, 15 * k);
      const up = randInt(rng, 2, 10 * k);
      const d2 = randInt(rng, 4, 12 * k);
      const ans = -d1 + up - d2;
      const shown = `(${-d1}) + ${up} - ${d2}`;
      return {
        prompt: `นักดำน้ำอยู่ที่ระดับ ${-d1} เมตร (ต่ำกว่าระดับน้ำทะเล) ว่ายขึ้นมา ${up} เมตร แล้วดำลงไปอีก ${d2} เมตร ตอนนี้นักดำน้ำอยู่ที่ระดับกี่เมตร`,
        expression: `${-d1} + ${up} - ${d2}`,
        shown,
        ans,
        lines: [`ประโยคสัญลักษณ์: ${shown}`, `= ${-d1 + up} - ${d2}`, `= ${ans}`, `ตอบ นักดำน้ำอยู่ที่ระดับ ${ans} เมตร`],
        mistakes: [{ value: -d1 - up + d2, message: 'ว่ายขึ้นหมายถึงบวก ดำลงหมายถึงลบ ลองตรวจทิศทางอีกครั้ง' }],
      };
    }
    case 'quiz': {
      const plus = randInt(rng, 2, 5);
      const minus = randInt(rng, 1, 4);
      const right = randInt(rng, 2, 6 * k);
      const wrong = randInt(rng, 3, 8 * k);
      const ans = plus * right - minus * wrong;
      const shown = `${right} × ${plus} + ${wrong} × (${-minus})`;
      return {
        prompt: `เกมตอบคำถาม ตอบถูกได้ ${plus} คะแนน ตอบผิดได้ ${-minus} คะแนน นักเรียนตอบถูก ${right} ข้อ และตอบผิด ${wrong} ข้อ ได้คะแนนรวมเท่าไร`,
        expression: `${right} * ${plus} + ${wrong} * (${-minus})`,
        shown,
        ans,
        lines: [`ประโยคสัญลักษณ์: ${shown}`, `= ${right * plus} + ${p(-minus * wrong)}`, `= ${ans}`, `ตอบ ได้คะแนนรวม ${ans} คะแนน`],
        mistakes: [{ value: plus * right + minus * wrong, message: 'ตอบผิดได้คะแนนติดลบ ต้องนำไปรวมเป็นจำนวนลบ' }],
      };
    }
  }
}

const word: Template = {
  id: 'INT_WORD',
  name: 'โจทย์ปัญหาจำนวนเต็ม',
  tiers: [3, 4],
  generate(rng, tier) {
    const ctx = pick(rng, tier === 3 ? (['temp', 'diver'] as const) : (['temp', 'diver', 'quiz'] as const));
    const w = makeWord(rng, ctx, tier === 4);
    const ex = makeWord(rng, ctx, tier === 4);
    return {
      variant: ctx,
      prompt: w.prompt,
      expression: w.expression,
      answer: w.ans,
      hints: [
        'แปลงเป็นประโยคสัญลักษณ์ก่อน: เพิ่มขึ้น/สูงขึ้น/ขึ้น = บวก, ลดลง/ต่ำลง/ดำลง = ลบ',
        `ประโยคสัญลักษณ์ของข้อนี้คือ ${w.shown} ลองคำนวณจากซ้ายไปขวา`,
        `ตัวอย่างใกล้เคียง (ตัวเลขอื่น): ${ex.lines.slice(0, 3).join(' ')}`,
      ],
      solution: w.lines,
      mistakes: uniqueMistakes(w.ans, [...w.mistakes, { value: -w.ans, message: SIGN_MISTAKE }]),
    };
  },
};

export const INTEGERS: Topic = {
  id: 'INT',
  name: 'จำนวนเต็ม',
  grade: 'ม.1',
  strand: 'จำนวนและพีชคณิต',
  standardRef: 'ค 1.1 ม.1/1 (ครูตรวจสอบก่อนใช้)',
  templates: [add, sub, mulDiv, threeTerms, orderOps, word],
};
