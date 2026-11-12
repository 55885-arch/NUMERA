import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { createUser, login, resetDemo, useDB, type Role } from '../data/store';
import { go } from '../components/ui';
import { Monster } from '../components/Art';

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
    <div className="page">
      <section className="hero-split">
        <div className="hero-text">
          <h1>แก้โจทย์คณิตศาสตร์ ม.1–ม.3 เพื่อร่ายเวท และพิชิตดันเจียน ที่ครูมอบหมาย</h1>
          <p>ครูเลือกบทเรียนตามหลักสูตร สสวท. นักเรียนฝึกในเกม 2D ได้คำใบ้ทีละขั้นเมื่อติด และครูพิมพ์ใบงานให้ผู้ที่ไม่มีอุปกรณ์ได้</p>
        </div>

        <div className="preview" aria-label="ตัวอย่างหน้าต่อสู้">
          <div className="preview-top">
            <div className="monster-art">
              <Monster kind="golem" size={88} />
            </div>
            <div className="grow">
              <div className="monster-name">
                โกเลมตัวเลข <span className="muted small mono">Lv.10</span>
              </div>
              <div className="hp" aria-label="พลังชีวิต 1 จาก 2">
                <span className="on" />
                <span />
              </div>
              <span className="small muted">ห้อง 2 · Practice · T2</span>
            </div>
          </div>
          <div className="prompt">−11 − (−52) = ?</div>
          <div className="answer-input graph-paper" style={{ display: 'grid', placeItems: 'center', borderRadius: 8 }}>
            41
          </div>
          <p className="feedback good">
            <Check className="icon" aria-hidden />
            ถูกต้อง · Equation Slash +15 EXP
          </p>
        </div>
      </section>

      <div className="grid two">
        <section className="card">
          <h2>เข้าสู่ระบบด้วยบัญชีทดลอง</h2>
          <h3 className="muted small">ครู</h3>
          <div className="chips">
            {teachers.map((u) => (
              <button key={u.id} className="btn" onClick={() => enter(u.id, 'teacher')}>
                {u.name}
              </button>
            ))}
          </div>
          <h3 className="muted small">นักเรียน</h3>
          <div className="chips">
            {students.map((u) => (
              <button key={u.id} className="btn" onClick={() => enter(u.id, 'student')}>
                {u.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>สร้างบัญชีใหม่</h2>
          <form onSubmit={signUp} className="form">
            <label>
              ชื่อที่แสดง
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อเล่นหรือนามแฝง" maxLength={30} required />
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
        ต้นแบบ: ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น และยังไม่มีรหัสผ่าน รุ่นจริงจะใช้ Supabase Auth ·{' '}
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
