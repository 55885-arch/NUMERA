import { useRef, useState, type FormEvent } from 'react';
import { checkAnswer, TIER_LABEL, type Question } from '../engine';

export interface BattleMonster {
  name: string;
  art: string;
  level: number;
}

export interface BattleSummary {
  defeated: boolean;
  correct: number;
  exp: number;
}

interface Props {
  monster: BattleMonster;
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
const HINT_TITLE = ['คำใบ้ 1: ชี้แนวคิด', 'คำใบ้ 2: ชี้ขั้นตอน', 'คำใบ้ 3: ตัวอย่างใกล้เคียง'];

type Feedback = { kind: 'good' | 'bad' | 'info'; text: string } | null;

export function Battle(props: Props) {
  const { monster, hitsToDefeat, totalQuestions, makeQuestion, onQuestionDone } = props;
  const [index, setIndex] = useState(props.startIndex ?? 0);
  const [hits, setHits] = useState(props.startHits ?? 0);
  const [question, setQuestion] = useState(() => makeQuestion(props.startIndex ?? 0));
  const [input, setInput] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [effect, setEffect] = useState<{ text: string; n: number } | null>(null);
  const [sessionExp, setSessionExp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hp = Math.max(0, hitsToDefeat - hits);
  const ended = (h: number, nextIndex: number) =>
    totalQuestions !== undefined ? nextIndex >= totalQuestions : h >= hitsToDefeat;

  function nextQuestion(h: number) {
    const ni = index + 1;
    if (ended(h, ni)) {
      setDone(true);
      return;
    }
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
    setFeedback({ kind: 'info', text: 'ไม่เป็นไร! อ่านวิธีทำด้านล่าง แล้วไปข้อต่อไป (ไม่เสีย EXP ที่สะสมไว้)' });
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (showSolution || done) return;
    const result = checkAnswer(question, input);
    if (result.status === 'invalid') {
      setFeedback({ kind: 'info', text: 'พิมพ์คำตอบเป็นจำนวนเต็ม เช่น 12 หรือ -7' });
      return;
    }
    if (result.status === 'correct') {
      const exp = onQuestionDone(question, true, hintLevel);
      const h = hits + 1;
      setHits(h);
      setSessionExp((x) => x + exp);
      setSessionCorrect((x) => x + 1);
      setEffect({ text: `${SPELL[question.tier]}!${exp ? ` +${exp} EXP` : ''}`, n: Date.now() });
      setFeedback({
        kind: 'good',
        text: exp ? 'ถูกต้อง! ร่ายเวทสำเร็จ' : 'ถูกต้อง! (ข้อนี้เคยทำแล้ว จึงได้ EXP น้อยลง ลองโจทย์ใหม่ ๆ ดูนะ)',
      });
      nextQuestion(h);
      return;
    }
    if (hintLevel < 3) {
      setHintLevel(hintLevel + 1);
      setFeedback({
        kind: 'bad',
        text: `${result.mistake ?? 'ยังไม่ถูก ลองคิดใหม่อีกครั้ง'} (เปิดคำใบ้ขั้นที่ ${hintLevel + 1} ให้แล้ว)`,
      });
    } else {
      revealSolution();
    }
  }

  function askHint() {
    if (showSolution) return;
    if (hintLevel < 3) setHintLevel(hintLevel + 1);
    else revealSolution();
  }

  function toggleSign() {
    setInput((v) => (v.trim().startsWith('-') ? v.trim().slice(1) : `-${v.trim()}`));
    inputRef.current?.focus();
  }

  if (done) {
    const defeated = hits >= hitsToDefeat;
    return (
      <div className="battle card">
        <div className="battle-result">
          <div className="big-art" aria-hidden>{defeated ? '🏆' : '💨'}</div>
          <h2>{defeated ? `ชนะ ${monster.name}!` : `${monster.name} ถอยหนีไป`}</h2>
          <p>
            ตอบถูก {sessionCorrect} ข้อ · ได้รับ <strong>+{sessionExp} EXP</strong>
          </p>
          <button className="btn primary" autoFocus onClick={() => props.onFinish({ defeated, correct: sessionCorrect, exp: sessionExp })}>
            ไปต่อ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="battle card">
      <div className="battle-top">
        <div className="monster">
          <div key={hits} className={`monster-art ${hits > (props.startHits ?? 0) ? 'hit' : ''}`} aria-hidden>
            {monster.art}
          </div>
          {effect && (
            <div key={effect.n} className="spell-fx" role="status">
              {effect.text}
            </div>
          )}
        </div>
        <div className="monster-info">
          <div className="monster-name">
            {monster.name} <span className="muted">Lv.{monster.level}</span>
          </div>
          <div className="hp" aria-label={`พลังชีวิต ${hp} จาก ${hitsToDefeat}`}>
            <div className="hp-fill" style={{ width: `${(hp / hitsToDefeat) * 100}%` }} />
          </div>
          <div className="muted small">
            HP {hp}/{hitsToDefeat}
            {totalQuestions !== undefined && ` · ข้อ ${Math.min(index + 1, totalQuestions)}/${totalQuestions}`}
          </div>
        </div>
      </div>

      <div className="question">
        <div className="muted small">โจทย์ · {TIER_LABEL[question.tier]}</div>
        <div className="prompt">{question.prompt}</div>
      </div>

      <form className="answer-row" onSubmit={submit}>
        <button type="button" className="btn" onClick={toggleSign} aria-label="สลับเครื่องหมายบวก/ลบ" disabled={showSolution}>
          ±
        </button>
        <input
          ref={inputRef}
          className="answer-input"
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
          ร่ายสกิล ✨
        </button>
      </form>

      {feedback && (
        <p className={`feedback ${feedback.kind}`} role="status">
          {feedback.kind === 'good' ? '✔ ' : feedback.kind === 'bad' ? '✘ ' : 'ℹ '}
          {feedback.text}
        </p>
      )}

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
        <div className="solution">
          <strong>วิธีทำ</strong>
          {question.solution.map((line, i) => (
            <div key={i} className="mono">
              {line}
            </div>
          ))}
          <button className="btn primary" autoFocus onClick={() => nextQuestion(hits)}>
            ข้อต่อไป →
          </button>
        </div>
      )}

      <div className="battle-actions">
        <button className="btn ghost" onClick={askHint} disabled={showSolution}>
          💡 {hintLevel < 3 ? `ขอคำใบ้ (${hintLevel}/3)` : 'ดูวิธีทำ'}
        </button>
        {props.onFlee && (
          <button className="btn ghost" onClick={props.onFlee}>
            หนีกลับ
          </button>
        )}
      </div>
    </div>
  );
}
