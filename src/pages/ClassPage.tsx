import { Fragment, useMemo, useState, type FormEvent } from 'react';
import {
  addStudentToClass, assignmentState, bestRun, className, createAssignment, createWorksheet, openAttendance, savePaperResult, setMark,
  studentLevel, studentMastery, today, useDB, userName,
  type AssignmentState, type Classroom, type DB, type Mark, type User, type Worksheet,
} from '../data/store';
import { generateSet, getTopic, templateName, TIER_LABEL, TIERS, TOPICS, type Tier } from '../engine';
import { Castle, ChartColumn, Check, ChevronLeft, ClipboardCheck, KeyRound, PenLine, Printer, type LucideIcon } from 'lucide-react';
import { Bar, Empty, Link, MasteryBadge, StateBadge, thaiDate } from '../components/ui';

type Tab = 'report' | 'dungeons' | 'attendance' | 'worksheets';
const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'report', label: 'รายงาน', Icon: ChartColumn },
  { id: 'dungeons', label: 'ดันเจียน', Icon: Castle },
  { id: 'attendance', label: 'เช็กชื่อ', Icon: ClipboardCheck },
  { id: 'worksheets', label: 'ใบงาน', Icon: Printer },
];

export function ClassPage({ user, classId }: { user: User; classId: string }) {
  const db = useDB();
  const [tab, setTab] = useState<Tab>('report');
  const c = db.classrooms.find((x) => x.id === classId && x.teacherId === user.id);
  if (!c) {
    return (
      <div className="page narrow">
        <Empty>ไม่พบห้องเรียนนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</Empty>
        <Link to="/teacher" className="btn">ห้องเรียนของฉัน</Link>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/teacher" className="btn ghost small-btn" >
            <ChevronLeft className="icon" aria-hidden />
            ห้องเรียนของฉัน
          </Link>
          <h1 style={{ marginTop: 8 }}>{className(c)}</h1>
          <div className="secondary small">
            ปีการศึกษา {c.academicYear} · ภาคเรียนที่ {c.semester} · {c.curriculum}
          </div>
        </div>
        <div className="join-code">
          <span className="muted small">รหัสเข้าร่วม</span>
          <strong className="mono">{c.joinCode}</strong>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            <t.Icon className="icon" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'report' && <ReportTab db={db} c={c} />}
      {tab === 'dungeons' && <DungeonTab db={db} c={c} />}
      {tab === 'attendance' && <AttendanceTab db={db} c={c} />}
      {tab === 'worksheets' && <WorksheetTab db={db} c={c} />}
    </div>
  );
}

// ==================================================================== report

function ReportTab({ db, c }: { db: DB; c: Classroom }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const assignments = db.assignments.filter((a) => a.classId === c.id);
  const classAttempts = db.attempts.filter((a) => c.studentIds.includes(a.studentId));

  const typeStats = new Map<string, { ok: number; all: number; topicId: string }>();
  for (const a of classAttempts) {
    const s = typeStats.get(a.templateId) ?? { ok: 0, all: 0, topicId: a.topicId };
    s.all++;
    if (a.correct) s.ok++;
    typeStats.set(a.templateId, s);
  }
  const byType = [...typeStats.entries()].sort((x, y) => x[1].ok / x[1].all - y[1].ok / y[1].all);

  const overall = classAttempts.length ? Math.round((classAttempts.filter((a) => a.correct).length / classAttempts.length) * 100) : null;

  function addStudent(e: FormEvent) {
    e.preventDefault();
    addStudentToClass(c.id, newName);
    setNewName('');
  }

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <span className="muted small">นักเรียน</span>
          <strong>{c.studentIds.length}</strong>
        </div>
        <div className="tile">
          <span className="muted small">โจทย์ที่ทำทั้งห้อง</span>
          <strong>{classAttempts.length}</strong>
        </div>
        <div className="tile">
          <span className="muted small">ความถูกต้องเฉลี่ย</span>
          <strong>{overall === null ? '–' : `${overall}%`}</strong>
        </div>
        <div className="tile">
          <span className="muted small">ดันเจียนที่มอบหมาย</span>
          <strong>{assignments.length}</strong>
        </div>
      </div>

      <div className="report-grid">
      <section className="card main">
        <h2>รายบุคคล</h2>
        {c.studentIds.length === 0 ? (
          <Empty>ยังไม่มีนักเรียน แชร์รหัส {c.joinCode} ให้นักเรียนเข้าร่วม หรือเพิ่มชื่อด้านล่าง</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th className="num">Level</th>
                  <th>Mastery จำนวนเต็ม</th>
                  <th>ถูก 20 ข้อล่าสุด</th>
                  {assignments.map((a) => (
                    <th key={a.id}>{a.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.studentIds.map((sid) => {
                  const mine = db.attempts.filter((a) => a.studentId === sid);
                  const recent = mine.slice(-20);
                  const acc = recent.length ? Math.round((recent.filter((a) => a.correct).length / recent.length) * 100) : null;
                  const lv = studentLevel(db, sid);
                  const wrong = mine.filter((a) => !a.correct).slice(-5).reverse();
                  return (
                    <Fragment key={sid}>
                      <tr>
                        <td>
                          <button className="linklike" onClick={() => setOpenId(openId === sid ? null : sid)} aria-expanded={openId === sid}>
                            {userName(db, sid)}
                          </button>
                        </td>
                        <td className="num mono">{lv.level}</td>
                        <td>
                          <MasteryBadge mastery={studentMastery(db, sid, 'INT')} />
                        </td>
                        <td>
                          {acc === null ? (
                            <span className="muted">ยังไม่ได้ทำ</span>
                          ) : (
                            <div className="acc">
                              <Bar value={acc} max={100} label="ความถูกต้อง" />
                              <span className="mono small">{acc}%</span>
                            </div>
                          )}
                        </td>
                        {assignments.map((a) => {
                          const best = bestRun(db, a.id, sid);
                          return (
                            <td key={a.id}>
                              <StateBadge state={assignmentState(db, a.id, sid)} extra={best ? `${best.correct}/${best.total}` : undefined} />
                            </td>
                          );
                        })}
                      </tr>
                      {openId === sid && (
                        <tr className="detail">
                          <td colSpan={4 + assignments.length}>
                            <strong>ข้อที่ผิดล่าสุด</strong>
                            {wrong.length === 0 ? (
                              <span className="muted"> ไม่มี</span>
                            ) : (
                              <ul>
                                {wrong.map((w) => (
                                  <li key={w.id}>
                                    {w.prompt} <span className="muted small">· คำตอบ <span className="mono">{w.answer}</span> · {templateName(w.topicId, w.templateId)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={addStudent} className="inline-form">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="เพิ่มนักเรียนด้วยชื่อ (สำหรับผู้ไม่มีอุปกรณ์)" aria-label="ชื่อนักเรียน" maxLength={30} />
          <button className="btn">เพิ่ม</button>
        </form>
      </section>

      <section className="card side">
        <h2>ทั้งห้องติดตรงไหน</h2>
        {byType.length === 0 ? (
          <Empty>ยังไม่มีข้อมูลการทำโจทย์</Empty>
        ) : (
          <ul className="plain type-list">
            {byType.map(([templateId, s], i) => {
              const pct = Math.round((s.ok / s.all) * 100);
              return (
                <li key={templateId}>
                  <div className="type-row">
                    <span>{templateName(s.topicId, templateId)}</span>
                    <span className="mono">
                      {pct}% <span className="muted">{s.ok}/{s.all}</span>
                    </span>
                  </div>
                  <Bar value={pct} max={100} label={`ความถูกต้อง ${templateName(s.topicId, templateId)}`} tone={i === 0 ? 'bad' : undefined} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">ถูกน้อยที่สุดอยู่บนสุด ใช้วางแผนสอนซ่อมเสริม · เห็นเฉพาะครูประจำห้อง</p>
      </section>
      </div>
    </>
  );
}

// ==================================================================== dungeons

function DungeonTab({ db, c }: { db: DB; c: Classroom }) {
  const assignments = db.assignments.filter((a) => a.classId === c.id);
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const [maxTier, setMaxTier] = useState<Tier>(2);
  const [questionsPerRoom, setQuestionsPerRoom] = useState(2);
  const [passPercent, setPassPercent] = useState(60);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [maxAttempts, setMaxAttempts] = useState(3);
  const topic = getTopic(topicId);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createAssignment({ classId: c.id, title: title.trim(), topicId, maxTier, rooms: 3, questionsPerRoom, passPercent, dueDate, maxAttempts });
    setTitle('');
  }

  const count = (assignmentId: string, state: AssignmentState) => c.studentIds.filter((sid) => assignmentState(db, assignmentId, sid) === state).length;

  return (
    <div className="grid two">
      <section className="card">
        <h2>ดันเจียนที่มอบหมาย</h2>
        {assignments.length === 0 ? (
          <Empty>ยังไม่มีดันเจียน</Empty>
        ) : (
          <ul className="plain">
            {assignments.map((a) => (
              <li key={a.id} className="assignment">
                <strong>{a.title}</strong>
                <div className="muted small">
                  {getTopic(a.topicId).name} · สูงสุด {TIER_LABEL[a.maxTier]} · {a.rooms} ห้อง + บอส · {a.questionsPerRoom} ข้อ/ห้อง · ผ่าน {a.passPercent}% · ส่ง {thaiDate(a.dueDate)}
                </div>
                <div className="chips small">
                  <StateBadge state="passed" extra={String(count(a.id, 'passed'))} />
                  <StateBadge state="in_progress" extra={String(count(a.id, 'in_progress'))} />
                  <StateBadge state="needs_practice" extra={String(count(a.id, 'needs_practice'))} />
                  <StateBadge state="assigned" extra={String(count(a.id, 'assigned'))} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Dungeon Builder</h2>
        <form onSubmit={submit} className="form">
          <label>
            ชื่อภารกิจ
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น หอคอยแห่งจำนวนเต็ม" maxLength={60} required />
          </label>
          <label>
            หน่วยการเรียนรู้
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.grade} · {t.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            สาระ: {topic.strand} · ตัวชี้วัด: {topic.standardRef}
          </p>
          <div className="form-row">
            <label>
              ระดับสูงสุด (Tier)
              <select value={maxTier} onChange={(e) => setMaxTier(Number(e.target.value) as Tier)}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ข้อต่อห้อง
              <input type="number" min={1} max={5} value={questionsPerRoom} onChange={(e) => setQuestionsPerRoom(Number(e.target.value))} />
            </label>
          </div>
          <div className="form-row">
            <label>
              เกณฑ์ผ่าน (%)
              <input type="number" min={10} max={100} step={5} value={passPercent} onChange={(e) => setPassPercent(Number(e.target.value))} />
            </label>
            <label>
              ลองได้ (ครั้ง)
              <input type="number" min={1} max={10} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
            </label>
          </div>
          <label>
            วันครบกำหนด
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
          <button className="btn primary">มอบหมายดันเจียน</button>
        </form>
      </section>
    </div>
  );
}

// ==================================================================== attendance

const MARKS: { id: Mark; label: string }[] = [
  { id: 'present', label: 'มา' },
  { id: 'late', label: 'สาย' },
  { id: 'absent', label: 'ขาด' },
  { id: 'leave', label: 'ลา' },
];

function AttendanceTab({ db, c }: { db: DB; c: Classroom }) {
  const sessions = db.attendance.filter((s) => s.classId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const [selected, setSelected] = useState<string | null>(null);
  const session = sessions.find((s) => s.id === selected) ?? sessions.find((s) => s.date === today());
  const tally = (marks: Record<string, Mark>) => MARKS.map((m) => `${m.label} ${Object.values(marks).filter((v) => v === m.id).length}`).join(' · ');

  return (
    <div className="grid two">
      <section className="card">
        <h2>{session ? `เช็กชื่อวันที่ ${thaiDate(session.date)}` : 'เช็กชื่อ'}</h2>
        {!session ? (
          <>
            <Empty>ยังไม่ได้เปิดรอบเช็กชื่อของวันนี้</Empty>
            <button className="btn primary" onClick={() => setSelected(openAttendance(c.id, today()))}>
              เปิดรอบเช็กชื่อวันนี้
            </button>
          </>
        ) : c.studentIds.length === 0 ? (
          <Empty>ยังไม่มีนักเรียนในห้อง</Empty>
        ) : (
          <ul className="plain attendance">
            {c.studentIds.map((sid) => (
              <li key={sid}>
                <span>{userName(db, sid)}</span>
                <div className="segmented" role="group" aria-label={`สถานะของ ${userName(db, sid)}`}>
                  {MARKS.map((m) => (
                    <button
                      key={m.id}
                      className={session.marks[sid] === m.id ? `seg on mark-${m.id}` : 'seg'}
                      aria-pressed={session.marks[sid] === m.id}
                      onClick={() => setMark(session.id, sid, m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>ประวัติการเช็กชื่อ</h2>
        {sessions.length === 0 ? (
          <Empty>ยังไม่มีประวัติ</Empty>
        ) : (
          <ul className="plain">
            {sessions.map((s) => (
              <li key={s.id} className="quest-item">
                <div>
                  <strong>{thaiDate(s.date)}</strong>
                  <div className="muted small">{tally(s.marks)}</div>
                </div>
                <button className="btn small-btn" onClick={() => setSelected(s.id)}>
                  เปิด
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ==================================================================== worksheets (Paper Mode)

function WorksheetTab({ db, c }: { db: DB; c: Classroom }) {
  const sheets = db.worksheets.filter((w) => w.classId === c.id);
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<Tier>(1);
  const [count, setCount] = useState(10);
  const [scoring, setScoring] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    createWorksheet({ classId: c.id, title: title.trim() || `ใบงานจำนวนเต็ม ${TIER_LABEL[tier]}`, topicId: 'INT', tier, count });
    setTitle('');
  }

  return (
    <>
      <div className="grid two">
        <section className="card">
          <h2>ใบงานของห้องนี้</h2>
          {sheets.length === 0 ? (
            <Empty>ยังไม่มีใบงาน</Empty>
          ) : (
            <ul className="plain">
              {sheets.map((w) => (
                <li key={w.id} className="assignment">
                  <strong>{w.title}</strong>
                  <div className="muted small">
                    รหัสชุดงาน <span className="mono">{w.code}</span> · {TIER_LABEL[w.tier]} · {w.count} ข้อ · บันทึกคะแนนแล้ว{' '}
                    {db.paperResults.filter((r) => r.worksheetId === w.id).length}/{c.studentIds.length} คน
                  </div>
                  <div className="chips">
                    <Link to={`/print/${w.id}`} className="btn small-btn">
                      <Printer className="icon" aria-hidden />
                      ใบงานนักเรียน
                    </Link>
                    <Link to={`/print/${w.id}/key`} className="btn small-btn">
                      <KeyRound className="icon" aria-hidden />
                      เฉลยครู
                    </Link>
                    <button className="btn small-btn" onClick={() => setScoring(scoring === w.id ? null : w.id)}>
                      <PenLine className="icon" aria-hidden />
                      บันทึกคะแนน
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>สร้างใบงาน A4</h2>
          <form onSubmit={submit} className="form">
            <label>
              ชื่อใบงาน
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น แบบฝึกจำนวนเต็ม ชุดที่ 1" maxLength={60} />
            </label>
            <div className="form-row">
              <label>
                ระดับ (Tier)
                <select value={tier} onChange={(e) => setTier(Number(e.target.value) as Tier)}>
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                จำนวนข้อ
                <input type="number" min={3} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </label>
            </div>
            <p className="muted small">สุ่มโจทย์จากคลังเดียวกับเกม นักเรียนที่ไม่มีอุปกรณ์ทำบนกระดาษได้ และได้ EXP/Mastery ด้วยเกณฑ์เดียวกัน</p>
            <button className="btn primary">สร้างใบงาน</button>
          </form>
        </section>
      </div>

      {scoring && <PaperScoring db={db} c={c} sheet={sheets.find((w) => w.id === scoring)!} />}
    </>
  );
}

function PaperScoring({ db, c, sheet }: { db: DB; c: Classroom; sheet: Worksheet }) {
  const questions = useMemo(() => generateSet(sheet.topicId, sheet.tier, sheet.count, sheet.seed), [sheet]);
  const [studentId, setStudentId] = useState(c.studentIds[0] ?? '');
  const saved = db.paperResults.find((r) => r.worksheetId === sheet.id && r.studentId === studentId);
  const [ticks, setTicks] = useState<Record<string, number[]>>({});
  const current = ticks[studentId] ?? saved?.correctIndexes ?? [];
  const toggle = (i: number) => setTicks({ ...ticks, [studentId]: current.includes(i) ? current.filter((x) => x !== i) : [...current, i] });

  if (c.studentIds.length === 0) return <section className="card"><Empty>เพิ่มนักเรียนในแท็บรายงานก่อนบันทึกคะแนน</Empty></section>;

  return (
    <section className="card">
      <h2>
        บันทึกคะแนนใบงาน <span className="mono">{sheet.code}</span>
      </h2>
      <div className="inline-form">
        <label className="grow">
          นักเรียน
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {c.studentIds.map((sid) => {
              const r = db.paperResults.find((x) => x.worksheetId === sheet.id && x.studentId === sid);
              return (
                <option key={sid} value={sid}>
                  {userName(db, sid)} {r ? `(บันทึกแล้ว ${r.correctIndexes.length}/${questions.length})` : ''}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <p className="muted small">ติ๊กข้อที่นักเรียนทำถูก</p>
      <ol className="score-grid">
        {questions.map((q, i) => (
          <li key={q.key}>
            <label>
              <input type="checkbox" checked={current.includes(i)} onChange={() => toggle(i)} />
              <span>
                ข้อ {i + 1} <span className="muted small">(ตอบ {q.answer})</span>
              </span>
            </label>
          </li>
        ))}
      </ol>
      <div className="inline-form">
        <strong>
          คะแนน {current.length}/{questions.length}
        </strong>
        <button className="btn primary" onClick={() => savePaperResult(sheet.id, studentId, questions, current)}>
          บันทึกคะแนนของ {userName(db, studentId)}
        </button>
        {saved && (
          <span className="badge state-passed" role="status">
            <Check className="icon" aria-hidden />
            บันทึกล่าสุด {thaiDate(saved.at)}
          </span>
        )}
      </div>
    </section>
  );
}
