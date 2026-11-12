import { useState, type FormEvent } from 'react';
import { ArrowRight, Castle, Trees } from 'lucide-react';
import {
  assignmentState, className, classesOfStudent, joinClass, runsOf, studentLevel, studentMastery, useDB, type User,
} from '../data/store';
import { getTopic } from '../engine';
import { freeFieldTier, titleFor } from '../game/rules';
import { Bar, Empty, LevelRing, Link, MasteryBadge, StateBadge, thaiDate } from '../components/ui';

export function StudentHome({ user }: { user: User }) {
  const db = useDB();
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const classes = classesOfStudent(db, user.id);
  const lv = studentLevel(db, user.id);
  const mastery = studentMastery(db, user.id, 'INT');
  const assignments = db.assignments.filter((a) => classes.some((c) => c.id === a.classId));
  const wrong = db.attempts.filter((a) => a.studentId === user.id && !a.correct).slice(-5).reverse();
  const title = classes[0] ? `${className(classes[0])}` : 'ภารกิจของฉัน';

  function join(e: FormEvent) {
    e.preventDefault();
    const err = joinClass(user.id, joinCode);
    setJoinMsg(err ?? 'เข้าร่วมห้องเรียนแล้ว');
    if (!err) setJoinCode('');
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="muted small">{classes[0] ? `ปีการศึกษา ${classes[0].academicYear} · ภาคเรียนที่ ${classes[0].semester}` : 'ยังไม่ได้เข้าร่วมห้องเรียน'}</span>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="grid two">
        <section className="card character" aria-label="ตัวละครของฉัน">
          <LevelRing level={lv.level} into={lv.into} need={lv.need} />
          <div className="grow">
            <h2 style={{ margin: 0 }}>{user.name}</h2>
            <div className="secondary small">{titleFor(lv.level)}</div>
            <div className="level-row">
              <span className="small muted">EXP สู่เลเวล {lv.level + 1}</span>
              <span className="small mono">
                {lv.into}/{lv.need}
              </span>
            </div>
            <Bar value={lv.into} max={lv.need} label="EXP สู่เลเวลถัดไป" tone="accent" />
            <div className="mastery-row">
              <span className="secondary">
                Topic Mastery · {getTopic('INT').name}
              </span>
              <MasteryBadge mastery={mastery} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2>ห้องเรียน</h2>
          {classes.length === 0 ? (
            <Empty>ขอรหัสเข้าร่วมจากครู แล้วกรอกด้านล่าง</Empty>
          ) : (
            <ul className="plain">
              {classes.map((c) => (
                <li key={c.id}>
                  <div>{className(c)}</div>
                  <div className="muted small">
                    ปีการศึกษา {c.academicYear} · ภาคเรียนที่ {c.semester}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={join} className="inline-form">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="รหัสเข้าร่วม" aria-label="รหัสเข้าร่วมห้องเรียน" className="mono" />
            <button className="btn">เข้าร่วม</button>
          </form>
          {joinMsg && (
            <p className="small secondary" role="status">
              {joinMsg}
            </p>
          )}
        </section>
      </div>

      <h2 className="section-title">ภารกิจ</h2>
      <div className="grid two">
        <section className="card quest">
          <h3>
            <Castle className="icon" aria-hidden />
            ดันเจียนจากครู
          </h3>
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
                      <div>{a.title}</div>
                      <div className="muted small">
                        ส่งภายใน {thaiDate(a.dueDate)} · ใช้สิทธิ์ <span className="mono">{used}/{a.maxAttempts}</span>
                      </div>
                    </div>
                    <div className="quest-actions">
                      <StateBadge state={state} />
                      <Link to={`/student/dungeon/${a.id}`} className={`btn small-btn ${state === 'passed' ? '' : 'primary'}`}>
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
          <h3>
            <Trees className="icon" aria-hidden />
            Free Field · Numberwood
          </h3>
          <p className="secondary">
            เดินสำรวจและฝึกกับมอนสเตอร์ ระดับโจทย์ตาม Character Level ของคุณ ตอนนี้เป็น <span className="mono">T{freeFieldTier(lv.level)}</span>
          </p>
          <Link to="/student/field" className="btn">
            เข้าสู่ Free Field
            <ArrowRight className="icon" aria-hidden />
          </Link>
        </section>
      </div>

      <h2 className="section-title">ข้อที่ควรทบทวน</h2>
      <section className="card">
        {wrong.length === 0 ? (
          <Empty>ยังไม่มีข้อที่ทำผิด</Empty>
        ) : (
          <ul className="plain record">
            {wrong.map((a) => (
              <li key={a.id}>
                <span>{a.prompt}</span>
                <span className="muted small">
                  คำตอบ <span className="mono">{a.answer}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
