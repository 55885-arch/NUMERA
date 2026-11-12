import { useEffect, useRef, useState } from 'react';
import { recordAnswer, studentLevel, useDB, getDB, type User } from '../data/store';
import { generateQuestion, newSeed, type Tier } from '../engine';
import { freeFieldTier } from '../game/rules';
import type { FieldHandle, FieldMonster } from '../game/field';
import { Battle } from '../components/Battle';
import { Bar, Link } from '../components/ui';

const MONSTERS: Record<Tier, { name: string; art: string }> = {
  1: { name: 'สไลม์เลขลบ', art: '🟡' },
  2: { name: 'ภูตจำนวนเต็ม', art: '👻' },
  3: { name: 'อัศวินเครื่องหมาย', art: '🛡️' },
  4: { name: 'Integer Sentinel', art: '🗿' },
};

export function FieldPage({ user }: { user: User }) {
  const db = useDB();
  const lv = studentLevel(db, user.id);
  const holder = useRef<HTMLDivElement>(null);
  const handle = useRef<FieldHandle | null>(null);
  const [encounter, setEncounter] = useState<(FieldMonster & { seed: number; tier: Tier }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import('../game/field').then(({ startField }) => {
      if (cancelled || !holder.current) return;
      handle.current = startField(holder.current, {
        playerLevel: studentLevel(getDB(), user.id).level,
        onEncounter: (m) => {
          // Character Level decides the question tier in Free Field (proposal §4.6)
          const tier = freeFieldTier(studentLevel(getDB(), user.id).level);
          setEncounter({ ...m, seed: newSeed(), tier });
        },
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
    };
  }, [user.id]);

  useEffect(() => handle.current?.setPlayerLevel(lv.level), [lv.level]);

  const end = (defeatedId: number | null) => {
    setEncounter(null);
    handle.current?.resume(defeatedId);
  };

  return (
    <div className="page">
      <div className="field-hud">
        <Link to="/student" className="btn ghost">
          ← กลับ Hub
        </Link>
        <div className="hud-level">
          <strong>Lv.{lv.level}</strong>
          <Bar value={lv.into} max={lv.need} label="EXP สู่เลเวลถัดไป" />
          <span className="muted small">
            {lv.into}/{lv.need} EXP
          </span>
        </div>
      </div>
      <p className="muted small">เดินด้วยปุ่มลูกศร / WASD หรือแตะจุดที่ต้องการไป · ชนมอนสเตอร์เพื่อเริ่มต่อสู้</p>
      <div className="field-wrap">
        <div ref={holder} className="field-canvas" />
        {loading && <div className="loading">กำลังโหลดแผนที่…</div>}
        {encounter && (
          <div className="overlay">
            <Battle
              monster={{ ...MONSTERS[encounter.tier], level: encounter.level }}
              hitsToDefeat={3}
              makeQuestion={(i) => generateQuestion('INT', encounter.tier, encounter.seed + i)}
              onQuestionDone={(question, correct, hintsUsed) =>
                recordAnswer({ studentId: user.id, question, correct, hintsUsed, source: 'field' })
              }
              onFinish={(s) => end(s.defeated ? encounter.id : null)}
              onFlee={() => end(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
