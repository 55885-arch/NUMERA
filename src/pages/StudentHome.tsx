import { useState, type FormEvent } from 'react';
import {
  assignmentState, className, classesOfStudent, joinClass, runsOf, studentLevel, studentMastery, useDB, type User,
} from '../data/store';
import { getTopic } from '../engine';
import { freeFieldTier, titleFor } from '../game/rules';
import { Bar, Empty, Link, MasteryBadge, StateBadge, thaiDate } from '../components/ui';

export function StudentHome({ user }: { user: User }) {
  const db = useDB();
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const classes = classesOfStudent(db, user.id);
  const lv = studentLevel(db, user.id);
  const mastery = studentMastery(db, user.id, 'INT');
  const assignments = db.assignments.filter((a) => classes.some((c) => c.id === a.classId));
  const wrong = db.attempts.filter((a) => a.studentId === user.id && !a.correct).slice(-5).reverse();

  function join(e: FormEvent) {
    e.preventDefault();
    const err = joinClass(user.id, joinCode);
    setJoinMsg(err ?? 'เข้าร่วมห้องเรียนสำเร็จ!');
    if (!err) setJoinCode('');
  }

  return (
    <div className="page">
      <div className="grid two">
        <section className="card character">
          <div className="avatar" aria-hidden>🧙</div>
          <div className="grow">
            <h2>{user.name}</h2>
            <div className="muted">ฉายา: {titleFor(lv.level)}</div>
            <div className="level-row">
              <strong>Character Level {lv.level}</strong>
              <span className="muted small">
                EXP {lv.into}/{lv.need}
              </span>
            </div>
            <Bar value={lv.into} max={lv.need} label="EXP สู่เลเวลถัดไป" />
            <div className="mastery-row">
              Topic Mastery · {getTopic('INT').name}: <MasteryBadge mastery={mastery} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2>My Classroom</h2>
          {classes.length === 0 ? (
            <Empty>ยังไม่ได้เข้าร่วมห้องเรียน ขอรหัสเข้าร่วมจากครู</Empty>
          ) : (
            <ul className="plain">
              {classes.map((c) => (
                <li key={c.id}>
                  <strong>{className(c)}</strong>
                  <div className="muted small">
                    ปีการศึกษา {c.academicYear} ภาคเรียนที่ {c.semester}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={join} className="inline-form">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="รหัสเข้าร่วม เช่น INT692" aria-label="รหัสเข้าร่วมห้องเรียน" />
            <button className="btn">เข้าร่วม</button>
          </form>
          {joinMsg && <p className="small" role="status">{joinMsg}</p>}
        </section>
      </div>

      <h2 className="section-title">Quest Board</h2>
      <div className="grid two">
        <section className="card quest">
          <h3>🏰 ดันเจียน (งานจากครู)</h3>
          {assignments.length === 0 ? (
            <Empty>ยังไม่มีภารกิจจากครู</Empty>
          ) : (
            <ul className="plain">
              {assignments.map((a) => {
                const state = assignmentState(db, a.id, user.id);
                const used = runsOf(db, a.id, user.id).length;
                return (
                  <li key={a.id} className="quest-item">
                    <div>
                      <strong>{a.title}</strong>
                      <div className="muted small">
                        ส่งภายใน {thaiDate(a.dueDate)} · ใช้สิทธิ์ {used}/{a.maxAttempts}
                      </div>
                    </div>
                    <div className="quest-actions">
                      <StateBadge state={state} />
                      <Link to={`/student/dungeon/${a.id}`} className="btn primary small-btn">
                        {state === 'in_progress' ? 'ทำต่อ' : state === 'assigned' ? 'เริ่ม' : 'ดูผล'}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card quest">
          <h3>🌳 Free Field: Numberwood</h3>
          <p>
            เดินสำรวจและสู้กับมอนสเตอร์เพื่อฝึกฝน มอนสเตอร์ปรับระดับตาม Character Level ของคุณ (ตอนนี้เจอโจทย์ระดับ T
            {freeFieldTier(lv.level)})
          </p>
          <Link to="/student/field" className="btn primary">
            เข้าสู่ Free Field →
          </Link>
        </section>
      </div>

      <h2 className="section-title">Learning Record: ข้อที่ควรทบทวน</h2>
      <section className="card">
        {wrong.length === 0 ? (
          <Empty>ยังไม่มีข้อที่ทำผิด เยี่ยมมาก!</Empty>
        ) : (
          <ul className="plain record">
            {wrong.map((a) => (
              <li key={a.id}>
                <span>{a.prompt}</span>
                <span className="muted small">คำตอบที่ถูก: {a.answer}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
