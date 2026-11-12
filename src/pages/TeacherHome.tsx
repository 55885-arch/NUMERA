import { useState, type FormEvent } from 'react';
import { className, createClass, useDB, type Grade, type User } from '../data/store';
import { Empty, Link, go } from '../components/ui';

const CURRICULUM = 'หลักสูตรแกนกลาง 2551 (ฉบับปรับปรุง 2560)';

export function TeacherHome({ user }: { user: User }) {
  const db = useDB();
  const classes = db.classrooms.filter((c) => c.teacherId === user.id);
  const [academicYear, setAcademicYear] = useState(2569);
  const [semester, setSemester] = useState<1 | 2>(2);
  const [grade, setGrade] = useState<Grade>('ม.1');
  const [section, setSection] = useState('1');
  const [course, setCourse] = useState('คณิตศาสตร์พื้นฐาน');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!section.trim() || !course.trim()) return;
    const id = createClass({ teacherId: user.id, academicYear, semester, grade, section: section.trim(), course: course.trim(), curriculum: CURRICULUM });
    go(`/teacher/class/${id}`);
  }

  return (
    <div className="page">
      <h1>Teacher Dashboard</h1>
      <div className="grid two">
        <section className="card">
          <h2>ห้องเรียนของฉัน</h2>
          {classes.length === 0 ? (
            <Empty>ยังไม่มีห้องเรียน สร้างห้องแรกได้จากแบบฟอร์มด้านข้าง</Empty>
          ) : (
            <ul className="plain">
              {classes.map((c) => (
                <li key={c.id} className="quest-item">
                  <div>
                    <strong>{className(c)}</strong>
                    <div className="muted small">
                      ปีการศึกษา {c.academicYear} ภาคเรียนที่ {c.semester} · นักเรียน {c.studentIds.length} คน · รหัส <span className="mono">{c.joinCode}</span>
                    </div>
                  </div>
                  <Link to={`/teacher/class/${c.id}`} className="btn primary small-btn">
                    เปิดห้อง
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>สร้างห้องเรียนใหม่</h2>
          <form onSubmit={submit} className="form">
            <div className="form-row">
              <label>
                ปีการศึกษา
                <input type="number" min={2560} max={2600} value={academicYear} onChange={(e) => setAcademicYear(Number(e.target.value))} required />
              </label>
              <label>
                ภาคเรียน
                <select value={semester} onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                ระดับชั้น
                <select value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
                  <option>ม.1</option>
                  <option>ม.2</option>
                  <option>ม.3</option>
                </select>
              </label>
              <label>
                ห้อง
                <input value={section} onChange={(e) => setSection(e.target.value)} maxLength={4} required />
              </label>
            </div>
            <label>
              รายวิชา
              <input value={course} onChange={(e) => setCourse(e.target.value)} maxLength={60} required />
            </label>
            <p className="muted small">เวอร์ชันหลักสูตร: {CURRICULUM}</p>
            <button className="btn primary">สร้างห้องเรียน</button>
          </form>
        </section>
      </div>
    </div>
  );
}
