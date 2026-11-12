import { className, useDB, type User } from '../data/store';
import { generateSet, getTopic, TIER_LABEL } from '../engine';
import { Empty, Link } from '../components/ui';

/** A4 worksheet (student copy) or answer key (teacher copy). The two are never mixed. */
export function PrintWorksheet({ user, worksheetId, showKey }: { user: User; worksheetId: string; showKey: boolean }) {
  const db = useDB();
  const sheet = db.worksheets.find((w) => w.id === worksheetId);
  const c = sheet && db.classrooms.find((x) => x.id === sheet.classId && x.teacherId === user.id);
  if (!sheet || !c) {
    return (
      <div className="page narrow">
        <Empty>ไม่พบใบงานนี้</Empty>
        <Link to="/teacher" className="btn">← กลับ</Link>
      </div>
    );
  }
  const questions = generateSet(sheet.topicId, sheet.tier, sheet.count, sheet.seed);
  const topic = getTopic(sheet.topicId);

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <Link to={`/teacher/class/${c.id}`} className="btn ghost">← กลับห้องเรียน</Link>
        <span className="muted small">{showKey ? 'เฉลยสำหรับครู (อย่าแจกนักเรียน)' : 'ใบงานสำหรับนักเรียน (ไม่มีเฉลย)'}</span>
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      <article className="sheet">
        <header className="sheet-head">
          <div>
            <div className="sheet-brand">NUMERA · {showKey ? 'เฉลยสำหรับครู' : 'ใบงาน'}</div>
            <h1>{sheet.title}</h1>
            <div>
              {className(c)} · ปีการศึกษา {c.academicYear} ภาคเรียนที่ {c.semester}
            </div>
            <div>
              หน่วย: {topic.name} · ระดับ {TIER_LABEL[sheet.tier]} · {questions.length} ข้อ
            </div>
          </div>
          <div className="sheet-code">
            รหัสชุดงาน
            <strong>{sheet.code}</strong>
          </div>
        </header>

        {!showKey && (
          <div className="name-line">
            <span>ชื่อ-สกุล ................................................................</span>
            <span>ชั้น ..............</span>
            <span>เลขที่ ..........</span>
          </div>
        )}

        <ol className="sheet-questions">
          {questions.map((q, i) => (
            <li key={q.key}>
              <div className="sheet-q">
                <span className="sheet-no">{i + 1}.</span>
                <span>{q.prompt}</span>
              </div>
              {showKey ? (
                <div className="sheet-key">
                  {q.solution.map((line, j) => (
                    <div key={j}>{line}</div>
                  ))}
                  <strong>ตอบ {q.answer}</strong>
                </div>
              ) : (
                <>
                  <div className="work-box">วิธีคิด</div>
                  <div className="answer-line">ตอบ ..............................</div>
                </>
              )}
            </li>
          ))}
        </ol>

        <footer className="sheet-foot">โจทย์สุ่มจากคลังเดียวกับเกม NUMERA · ครูบันทึกคะแนนด้วยรหัสชุดงาน {sheet.code}</footer>
      </article>
    </div>
  );
}
