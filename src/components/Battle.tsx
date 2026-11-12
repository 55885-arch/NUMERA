import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Lightbulb, Wand } from 'lucide-react';
import { checkAnswer, TIER_LABEL, type Question } from '../engine';
import { Monster, WizardBack, type MonsterKind } from './Art';

export interface BattleMonster {
  kind: MonsterKind;
  name: string;
  level: number;
}

export interface BattlePlayer {
  name: string;
  level: number;
  into: number;
  need: number;
}

export interface BattleSummary {
  defeated: boolean;
  correct: number;
  exp: number;
}

interface Props {
  monster: BattleMonster;
  player?: BattlePlayer;
  /** Correct answers needed to defeat the monster. */
  hitsToDefeat: number;
  /** Dungeon mode: the battle always ends after this many questions. */
  totalQuestions?: number;
  startIndex?: number;
  startHits?: number;
  makeQuestion: (index: number) => Question;
  /** Save the result of one question. Returns the EXP earned. */
  onQuestionDone: (q: Question, correct: boolean, hintsUsed: number) => number;
  onFinish: (summary: BattleSummary) => void;
  onFlee?: () => void;
}

const SPELL = { 1: 'Spark Bolt', 2: 'Number Burst', 3: 'Equation Slash', 4: 'Mastery Nova' } as const;
const HINT_TITLE = ['คำใบ้ 1 · แนวคิด', 'คำใบ้ 2 · ขั้นตอน', 'คำใบ้ 3 · ตัวอย่างใกล้เคียง'];
const CALC = 'คำนวณ ';

type Tone = 'good' | 'bad' | 'info';
type Line = { text: string; tone: Tone; n: number };

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Splits text into characters a reader sees (keeps Thai vowels and tone marks with their consonant). */
function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  if (!Seg) return Array.from(text);
  return Array.from(new Seg('th', { granularity: 'grapheme' }).segment(text), (s) => s.segment);
}

/** Narration that types itself out, like a story box. Instant when reduced motion is on. */
function useTypewriter(line: Line) {
  const [shown, setShown] = useState(line.text);
  useEffect(() => {
    if (reducedMotion()) {
      setShown(line.text);
      return;
    }
    const parts = graphemes(line.text);
    let i = 0;
    setShown('');
    const timer = window.setInterval(() => {
      i += 2;
      setShown(parts.slice(0, i).join(''));
      if (i >= parts.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [line.n, line.text]);
  return shown;
}

/** Background of the battle scene: dusk sky over the meadow, two platforms. */
function Scene() {
  return (
    <svg className="stage-bg" viewBox="0 0 560 260" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="stage-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121829" />
          <stop offset="1" stopColor="#36465a" />
        </linearGradient>
      </defs>
      <rect width="560" height="150" fill="url(#stage-sky)" />
      <path d="M0 132 C80 104 150 118 220 110 C300 100 360 122 440 108 C500 98 540 110 560 104 V150 H0 Z" fill="#24324a" />
      <rect y="146" width="560" height="114" fill="#3f6b45" />
      <ellipse cx="420" cy="132" rx="96" ry="18" fill="#35603c" />
      <ellipse cx="420" cy="128" rx="88" ry="13" fill="#4b7d55" />
      <ellipse cx="140" cy="246" rx="120" ry="22" fill="#35603c" />
      <ellipse cx="140" cy="240" rx="110" ry="16" fill="#4b7d55" />
    </svg>
  );
}

export function Battle(props: Props) {
  const { monster, player, hitsToDefeat, totalQuestions, makeQuestion, onQuestionDone } = props;
  const [index, setIndex] = useState(props.startIndex ?? 0);
  const [hits, setHits] = useState(props.startHits ?? 0);
  const [question, setQuestion] = useState(() => makeQuestion(props.startIndex ?? 0));
  const [input, setInput] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [line, setLine] = useState<Line>({ text: `${monster.name} ปรากฏตัว · ตอบโจทย์เพื่อร่ายเวท`, tone: 'info', n: 0 });
  const [cast, setCast] = useState<{ hit: boolean; n: number } | null>(null);
  const [sessionExp, setSessionExp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // keeps the latest EXP total for the closing line (state updates are batched)
  const sessionExpRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const shown = useTypewriter(line);

  const hp = Math.max(0, hitsToDefeat - hits);
  const ended = (h: number, nextIndex: number) =>
    totalQuestions !== undefined ? nextIndex >= totalQuestions : h >= hitsToDefeat;
  const say = (text: string, tone: Tone) => setLine((l) => ({ text, tone, n: l.n + 1 }));

  // Spell flies from the wizard's staff to the opponent; a miss fizzles on the way.
  useEffect(() => {
    if (!cast || !stageRef.current || !orbRef.current || reducedMotion()) return;
    const { width, height } = stageRef.current.getBoundingClientRect();
    const dx = width * 0.5;
    const dy = -height * 0.3;
    orbRef.current.animate(
      cast.hit
        ? [
            { transform: 'translate(0, 0) scale(0.6)', opacity: 0 },
            { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0.15 },
            { transform: `translate(${dx}px, ${dy}px) scale(1.4)`, opacity: 1, offset: 0.85 },
            { transform: `translate(${dx}px, ${dy}px) scale(2.2)`, opacity: 0 },
          ]
        : [
            { transform: 'translate(0, 0) scale(0.6)', opacity: 0 },
            { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0.2 },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45}px) scale(0.4)`, opacity: 0 },
          ],
      { duration: cast.hit ? 520 : 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [cast]);

  const closingLine = (h: number) =>
    h >= hitsToDefeat ? `${monster.name} หมดแรง · ได้รับ EXP รวม +${sessionExpRef.current}` : `${monster.name} ถอยหนีไป`;

  function nextQuestion(h: number, spell?: string) {
    const ni = index + 1;
    if (ended(h, ni)) {
      setDone(true);
      say(spell ? `${spell} · ${closingLine(h)}` : closingLine(h), h >= hitsToDefeat ? 'good' : 'info');
      return;
    }
    if (spell) say(spell, 'good');
    setIndex(ni);
    setQuestion(makeQuestion(ni));
    setInput('');
    setHintLevel(0);
    setShowSolution(false);
    inputRef.current?.focus();
  }

  function revealSolution() {
    onQuestionDone(question, false, 3);
    setShowSolution(true);
    say('ไม่เป็นไร · อ่านวิธีทำด้านล่าง แล้วไปข้อต่อไป EXP ที่สะสมไว้ไม่ลดลง', 'info');
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (showSolution || done) return;
    const result = checkAnswer(question, input);
    if (result.status === 'invalid') {
      say('พิมพ์คำตอบเป็นจำนวนเต็ม เช่น 12 หรือ -7', 'info');
      return;
    }
    if (result.status === 'correct') {
      const exp = onQuestionDone(question, true, hintLevel);
      const h = hits + 1;
      sessionExpRef.current += exp;
      setHits(h);
      setSessionExp((x) => x + exp);
      setSessionCorrect((x) => x + 1);
      setCast({ hit: true, n: Date.now() });
      const who = player?.name ?? 'คุณ';
      nextQuestion(
        h,
        exp
          ? `${who} ร่าย ${SPELL[question.tier]} · ได้ผล +${exp} EXP`
          : `${who} ร่าย ${SPELL[question.tier]} · ได้ผล แต่ข้อนี้เคยทำแล้ว จึงได้ EXP น้อยลง`,
      );
      return;
    }
    setCast({ hit: false, n: Date.now() });
    if (hintLevel < 3) {
      setHintLevel(hintLevel + 1);
      say(`เวทพลาดเป้า · ${result.mistake ?? 'ลองคิดใหม่อีกครั้ง'} · เปิดคำใบ้ขั้นที่ ${hintLevel + 1} ให้แล้ว`, 'bad');
    } else {
      revealSolution();
    }
  }

  function askHint() {
    if (showSolution || done) return;
    if (hintLevel < 3) setHintLevel(hintLevel + 1);
    else revealSolution();
  }

  function toggleSign() {
    setInput((v) => (v.trim().startsWith('-') ? v.trim().slice(1) : `-${v.trim()}`));
    inputRef.current?.focus();
  }

  const isCalc = question.prompt.startsWith(CALC);
  const defeated = hits >= hitsToDefeat;

  return (
    <div className="battle card">
      <div className="stage" ref={stageRef}>
        <Scene />

        <div className="foe-box">
          <div className="box-name">
            {monster.name} <span className="mono muted">Lv.{monster.level}</span>
          </div>
          <div className="hp" aria-label={`พลังชีวิต ${hp} จาก ${hitsToDefeat}`}>
            {Array.from({ length: hitsToDefeat }, (_, i) => (
              <span key={i} className={i < hp ? 'on' : ''} />
            ))}
          </div>
          <div className="small muted hp-text">
            <span className="mono">
              HP {hp}/{hitsToDefeat}
            </span>
            {totalQuestions !== undefined && ` · ข้อ ${Math.min(index + 1, totalQuestions)}/${totalQuestions}`}
          </div>
        </div>

        <div className={`foe ${done && defeated ? 'fainted' : ''}`}>
          <div key={cast?.hit ? cast.n : 'idle'} className={cast?.hit ? 'hit' : ''}>
            <Monster kind={monster.kind} size={128} label={monster.name} />
          </div>
        </div>

        <div className="hero">
          <WizardBack size={140} />
        </div>
        <div className="orb" ref={orbRef} aria-hidden />

        {player && (
          <div className="hero-box">
            <div className="box-name">
              {player.name} <span className="mono muted">Lv.{player.level}</span>
            </div>
            <div className="bar accent" aria-label={`EXP ${player.into} จาก ${player.need}`}>
              <div className="bar-fill" style={{ width: `${Math.min(100, (player.into / Math.max(1, player.need)) * 100)}%` }} />
            </div>
            <div className="small muted mono">
              {player.into}/{player.need} EXP
            </div>
          </div>
        )}
      </div>

      <div className={`dialogue ${line.tone}`} role="status" aria-live="polite">
        <span className="visually-hidden">{line.text}</span>
        <span aria-hidden>{shown}</span>
        <ChevronDown className="icon dialogue-more" aria-hidden />
      </div>

      {done ? (
        <div className="battle-result">
          <div className="result-figures">
            <div>
              <span className="small muted">ตอบถูก</span>
              <strong>{sessionCorrect}</strong>
            </div>
            <div>
              <span className="small muted">ได้รับ EXP</span>
              <strong>+{sessionExp}</strong>
            </div>
          </div>
          <button className="btn primary" autoFocus onClick={() => props.onFinish({ defeated, correct: sessionCorrect, exp: sessionExp })}>
            ไปต่อ
          </button>
        </div>
      ) : (
        <>
          <div className="question">
            <div className="muted small">
              {isCalc ? 'คำนวณ' : 'โจทย์ปัญหา'} · {TIER_LABEL[question.tier]}
            </div>
            {isCalc ? (
              <div className="prompt">{question.prompt.slice(CALC.length).replace(/-/g, '−')} = ?</div>
            ) : (
              <div className="prompt words">{question.prompt}</div>
            )}
          </div>

          <form className="answer-row" onSubmit={submit}>
            <button type="button" className="btn" onClick={toggleSign} aria-label="สลับเครื่องหมายบวกลบ" disabled={showSolution}>
              ±
            </button>
            <input
              ref={inputRef}
              className="answer-input graph-paper"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="คำตอบ"
              aria-label="คำตอบ"
              inputMode="text"
              autoComplete="off"
              autoFocus
              disabled={showSolution}
            />
            <button type="submit" className="btn primary" disabled={showSolution}>
              <Wand className="icon" aria-hidden />
              ร่ายสกิล
            </button>
          </form>

          {hintLevel > 0 && (
            <div className="hints">
              {question.hints.slice(0, hintLevel).map((h, i) => (
                <div key={i} className="hint">
                  <strong>{HINT_TITLE[i]}</strong>
                  <div>{h}</div>
                </div>
              ))}
            </div>
          )}

          {showSolution && (
            <div className="solution graph-paper">
              <strong>วิธีทำ</strong>
              {question.solution.map((l, i) => (
                <div key={i} className="mono">
                  {l}
                </div>
              ))}
              <button className="btn primary" autoFocus onClick={() => nextQuestion(hits)}>
                ข้อต่อไป
              </button>
            </div>
          )}

          <div className="battle-actions">
            <button className="btn ghost" onClick={askHint} disabled={showSolution}>
              <Lightbulb className="icon" aria-hidden />
              {hintLevel < 3 ? `ขอคำใบ้ ${hintLevel}/3` : 'ดูวิธีทำ'}
            </button>
            {props.onFlee && (
              <button className="btn ghost" onClick={props.onFlee}>
                หนีกลับ
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
