import { useState, type FormEvent } from 'react';
import { createUser, login, resetDemo, useDB, type Role } from '../data/store';
import { go } from '../components/ui';

export function Login() {
  const db = useDB();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('student');

  const enter = (userId: string, r: Role) => {
    login(userId);
    go(r === 'teacher' ? '/teacher' : '/student');
  };

  function signUp(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createUser(name, role);
    go(role === 'teacher' ? '/teacher' : '/student');
  }

  const teachers = db.users.filter((u) => u.role === 'teacher');
  const students = db.users.filter((u) => u.role === 'student');

  return (
    <div className="page narrow">
      <section className="hero">
        <div className="hero-art" aria-hidden>✨🔢🐉</div>
        <h1>NUMERA</h1>
        <p className="tagline">อาณาจักรแห่งตัวเลข · LEARN • CAST • LEVEL UP</p>
        <p>เปลี่ยนโจทย์คณิตศาสตร์ให้กลายเป็นพลังเวท เปลี่ยนการบ้านให้กลายเป็นภารกิจของทั้งห้องเรียน</p>
      </section>

      <div className="grid two">
        <section className="card">
          <h2>เข้าสู่ระบบด้วยบัญชีทดลอง</h2>
          <h3 className="muted small">ครู</h3>
          <div className="chips">
            {teachers.map((u) => (
              <button key={u.id} className="btn" onClick={() => enter(u.id, 'teacher')}>
                👩‍🏫 {u.name}
              </button>
            ))}
          </div>
          <h3 className="muted small">นักเรียน</h3>
          <div className="chips">
            {students.map((u) => (
              <button key={u.id} className="btn" onClick={() => enter(u.id, 'student')}>
                🧙 {u.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>สร้างบัญชีใหม่</h2>
          <form onSubmit={signUp} className="form">
            <label>
              ชื่อที่แสดง
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ชื่อเล่น หรือนามแฝง" maxLength={30} required />
            </label>
            <fieldset className="radio-row">
              <legend>บทบาท</legend>
              <label>
                <input type="radio" checked={role === 'student'} onChange={() => setRole('student')} /> นักเรียน
              </label>
              <label>
                <input type="radio" checked={role === 'teacher'} onChange={() => setRole('teacher')} /> ครู
              </label>
            </fieldset>
            <button className="btn primary">สร้างบัญชีและเข้าใช้งาน</button>
          </form>
        </section>
      </div>

      <p className="note">
        ต้นแบบ (Prototype): ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น และยังไม่มีรหัสผ่าน รุ่นจริงจะใช้ Supabase Auth ·{' '}
        <button
          className="linklike"
          onClick={() => {
            if (confirm('ล้างข้อมูลทั้งหมดในเครื่องนี้และกลับไปใช้ข้อมูลตัวอย่าง?')) resetDemo();
          }}
        >
          รีเซ็ตข้อมูลตัวอย่าง
        </button>
      </p>
    </div>
  );
}
