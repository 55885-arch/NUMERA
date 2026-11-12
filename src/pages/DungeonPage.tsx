import { useState } from 'react';
import { answerInRun, finishRoom, runsOf, startRun, useDB, type Assignment, type DB, type DungeonRun, type User } from '../data/store';
import { generateQuestion, getTopic, templateName, TIER_LABEL } from '../engine';
import { roomTiers } from '../game/rules';
import { Battle } from '../components/Battle';
import { Empty, Link, thaiDate } from '../components/ui';

const ROOM_KIND = ['Training', 'Practice', 'Apply', 'Challenge', 'Trial'];
const ROOM_MONSTERS = [
  { name: 'ค้างคาวเฝ้าประตู', art: '🦇' },
  { name: 'โกเลมตัวเลข', art: '🧱' },
  { name: 'นักเวทเครื่องหมาย', art: '🧙‍♂️' },
  { name: 'อสูรเงา', art: '👹' },
  { name: 'อัศวินหอคอย', art: '🛡️' },
];
const BOSS = { name: 'Gatekeeper ผู้เฝ้าหอคอย', art: '🐉' };

const questionsIn = (a: Assignment, roomIndex: number) => (roomIndex < a.rooms ? a.questionsPerRoom : a.questionsPerRoom + 1);
const roomLabel = (a: Assignment, i: number) => (i < a.rooms ? `ห้อง ${i + 1}: ${ROOM_KIND[i] ?? 'Room'}` : 'บอส');

/** Boss Grade (proposal §3.5): based on accuracy, never on speed. */
function grade(run: DungeonRun): { medal: string; name: string } | null {
  if (run.status !== 'passed') return null;
  const pct = (run.correct / Math.max(1, run.total)) * 100;
  if (pct >= 90) return { medal: '🥇', name: 'Gold' };
  if (pct >= 75) return { medal: '🥈', name: 'Silver' };
  return { medal: '🥉', name: 'Bronze' };
}

/** "Reflect" step: what went well and what to practise, by question type. */
function reflection(db: DB, run: DungeonRun): string {
  const mine = db.attempts.filter(
    (t) => t.studentId === run.studentId && t.assignmentId === run.assignmentId && t.at >= run.startedAt && (!run.finishedAt || t.at <= run.finishedAt),
  );
  const byType = new Map<string, { ok: number; all: number; topicId: string }>();
  for (const t of mine) {
    const s = byType.get(t.templateId) ?? { ok: 0, all: 0, topicId: t.topicId };
    s.all++;
    if (t.correct) s.ok++;
    byType.set(t.templateId, s);
  }
  const ranked = [...byType.entries()].sort((x, y) => y[1].ok / y[1].all - x[1].ok / x[1].all);
  if (ranked.length === 0) return '';
  const [bestId, best] = ranked[0];
  const [weakId, weak] = ranked[ranked.length - 1];
  const good = best.ok > 0 ? `จุดที่ทำได้ดีคือ “${templateName(best.topicId, bestId)}”` : '';
  const practise =
    weak.ok < weak.all
      ? `ส่วนที่ควรฝึกเพิ่มคือ “${templateName(weak.topicId, weakId)}” ลองฝึกใน Free Field อีกสักชุดก่อนกลับมาท้าทายใหม่`
      : 'ทำได้ถูกทุกรูปแบบ ลองท้าทายโจทย์ระดับสูงขึ้นได้เลย';
  return [good, practise].filter(Boolean).join(' · ');
}

export function DungeonPage({ user, assignmentId }: { user: User; assignmentId: string }) {
  const db = useDB();
  const [error, setError] = useState<string | null>(null);
  // Which room's battle is on screen, so its victory panel stays visible after the last answer is saved.
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const a = db.assignments.find((x) => x.id === assignmentId);
  if (!a) {
    return (
      <div className="page narrow">
        <Empty>ไม่พบภารกิจนี้</Empty>
        <Link to="/student" className="btn">← กลับ Hub</Link>
      </div>
    );
  }

  const runs = runsOf(db, a.id, user.id);
  const open = runs.find((r) => r.status === 'in_progress');
  const last = runs.filter((r) => r.status !== 'in_progress').at(-1);
  const tiers = roomTiers(a.maxTier, a.rooms);
  const topic = getTopic(a.topicId);

  const header = (
    <div className="dungeon-head">
      <Link to="/student" className="btn ghost">← กลับ Hub</Link>
      <div>
        <h1>{a.title}</h1>
        <div className="muted small">
          หน่วย: {topic.name} ({topic.grade}) · {topic.standardRef} · ส่งภายใน {thaiDate(a.dueDate)}
        </div>
      </div>
    </div>
  );

  const chips = (current: number | null) => (
    <ol className="rooms">
      {tiers.map((t, i) => (
        <li key={i} className={current === null ? '' : i < current ? 'done' : i === current ? 'now' : ''}>
          {current !== null && i < current ? '✔ ' : ''}
          {roomLabel(a, i)} <span className="muted small">T{t}</span>
        </li>
      ))}
    </ol>
  );

  // ---------------------------------------------------------------- playing
  if (open) {
    const count = questionsIn(a, open.roomIndex);
    const base = open.roomIndex * a.questionsPerRoom;
    const isBoss = open.roomIndex >= a.rooms;
    const monster = isBoss ? BOSS : ROOM_MONSTERS[open.roomIndex % ROOM_MONSTERS.length];
    const key = `${open.id}-${open.roomIndex}`;
    if (open.questionIndex < count && playingKey !== key) setPlayingKey(key);
    const showBattle = open.questionIndex < count || playingKey === key;
    return (
      <div className="page narrow">
        {header}
        {chips(open.roomIndex)}
        {!showBattle ? (
          <section className="card center">
            <h2>{roomLabel(a, open.roomIndex)} เสร็จแล้ว</h2>
            <button className="btn primary" onClick={() => finishRoom(open.id)}>
              {isBoss ? 'ดูผลภารกิจ' : 'ไปห้องถัดไป →'}
            </button>
          </section>
        ) : (
          <Battle
            key={key}
            monster={{ ...monster, level: tiers[open.roomIndex] * 5 }}
            hitsToDefeat={count}
            totalQuestions={count}
            startIndex={open.questionIndex}
            startHits={open.roomCorrect}
            makeQuestion={(i) => generateQuestion(a.topicId, tiers[open.roomIndex], open.seed + base + i)}
            onQuestionDone={(question, correct, hintsUsed) => answerInRun(open.id, { studentId: user.id, question, correct, hintsUsed })}
            onFinish={() => finishRoom(open.id)}
          />
        )}
        <p className="muted small center">ระบบบันทึกความคืบหน้าอัตโนมัติ ออกแล้วกลับมาทำต่อได้</p>
      </div>
    );
  }

  // ---------------------------------------------------------------- intro / result
  const attemptsLeft = a.maxAttempts - runs.length;
  const medal = last && grade(last);
  return (
    <div className="page narrow">
      {header}

      {last && (
        <section className={`card result ${last.status}`}>
          <div className="big-art" aria-hidden>{last.status === 'passed' ? (medal?.medal ?? '🏆') : '📘'}</div>
          <h2>{last.status === 'passed' ? `ภารกิจสำเร็จ! เหรียญ ${medal?.name}` : 'ยังไม่ผ่านเกณฑ์ ลองฝึกเพิ่มอีกนิด'}</h2>
          <p>
            ทำถูก <strong>{last.correct}/{last.total}</strong> ข้อ (เกณฑ์ผ่าน {a.passPercent}%) · ได้รับ <strong>+{last.exp} EXP</strong>
          </p>
          <p>{reflection(db, last)}</p>
        </section>
      )}

      <section className="card">
        <h2>เส้นทางในดันเจียน</h2>
        {chips(null)}
        <ul className="plain small muted">
          <li>แต่ละห้องมี {a.questionsPerRoom} ข้อ · บอส {a.questionsPerRoom + 1} ข้อ · ระดับสูงสุด {TIER_LABEL[a.maxTier]}</li>
          <li>ตอบผิดไม่เสีย EXP มีคำใบ้ 3 ขั้น ถ้ายังไม่ได้จะแสดงวิธีทำแล้วไปข้อต่อไป</li>
          <li>เนื้อหาและระดับกำหนดโดยครู ไม่เปลี่ยนตาม Character Level</li>
        </ul>
        {error && <p className="feedback bad" role="alert">✘ {error}</p>}
        {attemptsLeft > 0 ? (
          <button
            className="btn primary"
            onClick={() => {
              const r = startRun(a.id, user.id);
              setError(r.error ?? null);
            }}
          >
            {runs.length === 0 ? 'เริ่มภารกิจ ⚔️' : `ท้าทายอีกครั้ง (เหลือ ${attemptsLeft} ครั้ง)`}
          </button>
        ) : (
          <p className="muted">ใช้สิทธิ์ครบ {a.maxAttempts} ครั้งแล้ว ฝึกต่อใน Free Field ได้เสมอ</p>
        )}
      </section>
    </div>
  );
}
