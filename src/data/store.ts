/**
 * Prototype data store, saved in the browser (localStorage).
 * The shapes follow the proposal's tables (§9.3) so this can be swapped for
 * Supabase later. NOTE: in this prototype all checks run in the browser;
 * the real version must re-check answers and EXP on the server (README D3).
 */
import { useSyncExternalStore } from 'react';
import { generateQuestion, newSeed, type Question, type Tier } from '../engine';
import { mulberry32 } from '../engine/random';
import { expForCorrect, levelInfo, masteryOf, type Mastery } from '../game/rules';

export type Role = 'teacher' | 'student';
export type Grade = 'ม.1' | 'ม.2' | 'ม.3';

export interface User {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Classroom {
  id: string;
  teacherId: string;
  academicYear: number;
  semester: 1 | 2;
  grade: Grade;
  section: string;
  course: string;
  curriculum: string;
  joinCode: string;
  studentIds: string[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  topicId: string;
  maxTier: Tier;
  rooms: number;
  questionsPerRoom: number;
  passPercent: number;
  dueDate: string;
  maxAttempts: number;
  createdAt: string;
}

export type RunStatus = 'in_progress' | 'passed' | 'needs_practice';

export interface DungeonRun {
  id: string;
  assignmentId: string;
  studentId: string;
  attemptNo: number;
  seed: number;
  status: RunStatus;
  roomIndex: number;
  questionIndex: number;
  roomCorrect: number;
  correct: number;
  total: number;
  exp: number;
  startedAt: string;
  finishedAt?: string;
}

export type Source = 'field' | 'dungeon' | 'paper';

export interface Attempt {
  id: string;
  studentId: string;
  source: Source;
  assignmentId?: string;
  worksheetId?: string;
  questionKey: string;
  templateId: string;
  topicId: string;
  tier: Tier;
  prompt: string;
  answer: number;
  correct: boolean;
  hintsUsed: number;
  exp: number;
  at: string;
}

export type Mark = 'present' | 'late' | 'absent' | 'leave';

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string;
  marks: Record<string, Mark>;
}

export interface Worksheet {
  id: string;
  classId: string;
  code: string;
  title: string;
  topicId: string;
  tier: Tier;
  count: number;
  seed: number;
  createdAt: string;
}

export interface PaperResult {
  id: string;
  worksheetId: string;
  studentId: string;
  correctIndexes: number[];
  at: string;
}

export interface DB {
  version: 1;
  users: User[];
  classrooms: Classroom[];
  assignments: Assignment[];
  runs: DungeonRun[];
  attempts: Attempt[];
  attendance: AttendanceSession[];
  worksheets: Worksheet[];
  paperResults: PaperResult[];
  sessionUserId: string | null;
}

// ------------------------------------------------------------------ helpers

const KEY = 'numera-db-v1';
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const now = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = (n: number) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function emptyDB(): DB {
  return { version: 1, users: [], classrooms: [], assignments: [], runs: [], attempts: [], attendance: [], worksheets: [], paperResults: [], sessionUserId: null };
}

/** Demo data so the prototype can be shown straight away. */
export function demoDB(): DB {
  const db = emptyDB();
  const teacher: User = { id: 'demo-teacher', name: 'ครูตัวอย่าง', role: 'teacher', createdAt: now() };
  const names = ['ภูมิ', 'มายด์', 'ต้นข้าว', 'ปลื้ม'];
  const students: User[] = names.map((name, i) => ({ id: `demo-student-${i + 1}`, name, role: 'student', createdAt: now() }));
  db.users.push(teacher, ...students);
  const cls: Classroom = {
    id: 'demo-class',
    teacherId: teacher.id,
    academicYear: 2569,
    semester: 2,
    grade: 'ม.1',
    section: '2',
    course: 'คณิตศาสตร์พื้นฐาน',
    curriculum: 'หลักสูตรแกนกลาง 2551 (ฉบับปรับปรุง 2560)',
    joinCode: 'INT692',
    studentIds: students.slice(0, 3).map((s) => s.id),
    createdAt: now(),
  };
  db.classrooms.push(cls);
  db.assignments.push({
    id: 'demo-dungeon',
    classId: cls.id,
    title: 'หอคอยแห่งจำนวนเต็ม (The Integer Spire)',
    topicId: 'INT',
    maxTier: 3,
    rooms: 3,
    questionsPerRoom: 2,
    passPercent: 60,
    dueDate: addDays(14),
    maxAttempts: 3,
    createdAt: now(),
  });
  // some practice history so reports are not empty
  const accuracy = [0.9, 0.7, 0.45];
  const rng = mulberry32(2569);
  students.slice(0, 3).forEach((s, si) => {
    for (let i = 0; i < 14; i++) {
      const tier = (i < 7 ? 1 : 2) as Tier;
      const q = generateQuestion('INT', tier, 1000 * si + i);
      const correct = rng() < accuracy[si];
      record(db, { studentId: s.id, question: q, correct, hintsUsed: correct && rng() < 0.3 ? 1 : 0, source: 'field' });
    }
  });
  return db;
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    /* storage blocked or broken: fall back to demo data */
  }
  return demoDB();
}

let db: DB = typeof localStorage === 'undefined' ? demoDB() : load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore: data stays in memory for this tab */
  }
}

function commit<T>(fn: (draft: DB) => T): T {
  const draft = structuredClone(db);
  const result = fn(draft);
  db = draft;
  save();
  listeners.forEach((l) => l());
  return result;
}

export function useDB(): DB {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => db,
  );
}

export const getDB = () => db;

// ------------------------------------------------------------------ selectors

export const currentUser = (d: DB) => d.users.find((u) => u.id === d.sessionUserId) ?? null;
export const userName = (d: DB, userId: string) => d.users.find((u) => u.id === userId)?.name ?? '?';
export const studentExp = (d: DB, studentId: string) =>
  d.attempts.reduce((sum, a) => (a.studentId === studentId ? sum + a.exp : sum), 0);
export const studentLevel = (d: DB, studentId: string) => levelInfo(studentExp(d, studentId));

export function studentMastery(d: DB, studentId: string, topicId: string): Mastery {
  return masteryOf(d.attempts.filter((a) => a.studentId === studentId && a.topicId === topicId));
}

export const classesOfStudent = (d: DB, studentId: string) => d.classrooms.filter((c) => c.studentIds.includes(studentId));
export const className = (c: Classroom) => `${c.grade}/${c.section} ${c.course}`;

export type AssignmentState = 'assigned' | 'in_progress' | 'passed' | 'needs_practice';

export const STATE_LABEL: Record<AssignmentState, string> = {
  assigned: 'ยังไม่เริ่ม',
  in_progress: 'กำลังทำ',
  passed: 'ผ่านแล้ว',
  needs_practice: 'ควรฝึกเพิ่ม',
};

export const runsOf = (d: DB, assignmentId: string, studentId: string) =>
  d.runs.filter((r) => r.assignmentId === assignmentId && r.studentId === studentId);

export function assignmentState(d: DB, assignmentId: string, studentId: string): AssignmentState {
  const runs = runsOf(d, assignmentId, studentId);
  if (runs.length === 0) return 'assigned';
  if (runs.some((r) => r.status === 'passed')) return 'passed';
  if (runs.some((r) => r.status === 'in_progress')) return 'in_progress';
  return 'needs_practice';
}

export function bestRun(d: DB, assignmentId: string, studentId: string): DungeonRun | undefined {
  return runsOf(d, assignmentId, studentId)
    .filter((r) => r.status !== 'in_progress')
    .sort((a, b) => b.correct / b.total - a.correct / a.total)[0];
}

// ------------------------------------------------------------------ actions

export const resetDemo = () => commit((d) => Object.assign(d, demoDB()));
export const login = (userId: string) => commit((d) => void (d.sessionUserId = userId));
export const logout = () => commit((d) => void (d.sessionUserId = null));

export function createUser(name: string, role: Role): string {
  return commit((d) => {
    const user: User = { id: id(), name: name.trim(), role, createdAt: now() };
    d.users.push(user);
    d.sessionUserId = user.id;
    return user.id;
  });
}

export function createClass(input: Omit<Classroom, 'id' | 'joinCode' | 'studentIds' | 'createdAt'>): string {
  return commit((d) => {
    let joinCode = code(6);
    while (d.classrooms.some((c) => c.joinCode === joinCode)) joinCode = code(6);
    const c: Classroom = { ...input, id: id(), joinCode, studentIds: [], createdAt: now() };
    d.classrooms.push(c);
    return c.id;
  });
}

export function joinClass(studentId: string, joinCode: string): string | null {
  return commit((d) => {
    const c = d.classrooms.find((x) => x.joinCode === joinCode.trim().toUpperCase());
    if (!c) return 'ไม่พบห้องเรียนที่ใช้รหัสนี้ ลองตรวจรหัสกับครูอีกครั้ง';
    if (c.studentIds.includes(studentId)) return 'คุณอยู่ในห้องนี้แล้ว';
    c.studentIds.push(studentId);
    return null;
  });
}

/**
 * Paper Mode: the teacher adds a student by name, so a student without a
 * device still has a record (they can log in later with this name if they want).
 */
export function addStudentToClass(classId: string, name: string) {
  commit((d) => {
    const c = d.classrooms.find((x) => x.id === classId);
    if (!c || !name.trim()) return;
    const user: User = { id: id(), name: name.trim(), role: 'student', createdAt: now() };
    d.users.push(user);
    c.studentIds.push(user.id);
  });
}

export function createAssignment(input: Omit<Assignment, 'id' | 'createdAt'>): string {
  return commit((d) => {
    const a: Assignment = { ...input, id: id(), createdAt: now() };
    d.assignments.push(a);
    return a.id;
  });
}

/** Returns the run to play, or an error message. Resumes an unfinished run. */
export function startRun(assignmentId: string, studentId: string): { runId?: string; error?: string } {
  return commit((d) => {
    const runs = d.runs.filter((r) => r.assignmentId === assignmentId && r.studentId === studentId);
    const open = runs.find((r) => r.status === 'in_progress');
    if (open) return { runId: open.id };
    const a = d.assignments.find((x) => x.id === assignmentId);
    if (!a) return { error: 'ไม่พบภารกิจ' };
    if (runs.length >= a.maxAttempts) return { error: 'ใช้สิทธิ์ทำภารกิจนี้ครบแล้ว' };
    const run: DungeonRun = {
      id: id(), assignmentId, studentId, attemptNo: runs.length + 1, seed: newSeed(), status: 'in_progress',
      roomIndex: 0, questionIndex: 0, roomCorrect: 0, correct: 0, total: 0, exp: 0, startedAt: now(),
    };
    d.runs.push(run);
    return { runId: run.id };
  });
}

interface RecordInput {
  studentId: string;
  question: Question;
  correct: boolean;
  hintsUsed: number;
  source: Source;
  assignmentId?: string;
  worksheetId?: string;
}

/** Saves one answered question and returns the EXP it earned. */
function record(d: DB, input: RecordInput): number {
  const { question: q } = input;
  const solvedBefore = d.attempts.filter((a) => a.studentId === input.studentId && a.correct && a.questionKey === q.key).length;
  const exp = input.correct ? expForCorrect(q.tier, solvedBefore, input.hintsUsed) : 0;
  d.attempts.push({
    id: id(), studentId: input.studentId, source: input.source, assignmentId: input.assignmentId, worksheetId: input.worksheetId,
    questionKey: q.key, templateId: q.templateId, topicId: q.topicId, tier: q.tier, prompt: q.prompt, answer: q.answer,
    correct: input.correct, hintsUsed: input.hintsUsed, exp, at: now(),
  });
  return exp;
}

export const recordAnswer = (input: RecordInput) => commit((d) => record(d, input));

/** Dungeon: save an answer and move the run forward in one step. */
export function answerInRun(runId: string, input: Omit<RecordInput, 'source' | 'assignmentId'>): number {
  return commit((d) => {
    const run = d.runs.find((r) => r.id === runId);
    if (!run) return 0;
    const exp = record(d, { ...input, source: 'dungeon', assignmentId: run.assignmentId });
    run.questionIndex++;
    run.total++;
    run.exp += exp;
    if (input.correct) {
      run.correct++;
      run.roomCorrect++;
    }
    return exp;
  });
}

/** Dungeon: a room is done. Moves to the next room or finishes the run. */
export function finishRoom(runId: string) {
  commit((d) => {
    const run = d.runs.find((r) => r.id === runId);
    const a = run && d.assignments.find((x) => x.id === run.assignmentId);
    if (!run || !a) return;
    if (run.roomIndex < a.rooms) {
      run.roomIndex++;
      run.questionIndex = 0;
      run.roomCorrect = 0;
    } else {
      run.status = (run.correct / Math.max(1, run.total)) * 100 >= a.passPercent ? 'passed' : 'needs_practice';
      run.finishedAt = now();
    }
  });
}

export function openAttendance(classId: string, date: string): string {
  return commit((d) => {
    const existing = d.attendance.find((s) => s.classId === classId && s.date === date);
    if (existing) return existing.id;
    const s: AttendanceSession = { id: id(), classId, date, marks: {} };
    d.attendance.push(s);
    return s.id;
  });
}

export function setMark(sessionId: string, studentId: string, mark: Mark) {
  commit((d) => {
    const s = d.attendance.find((x) => x.id === sessionId);
    if (s) s.marks[studentId] = mark;
  });
}

export function createWorksheet(input: Omit<Worksheet, 'id' | 'code' | 'seed' | 'createdAt'>): string {
  return commit((d) => {
    const w: Worksheet = { ...input, id: id(), code: `WS-${code(4)}`, seed: newSeed(), createdAt: now() };
    d.worksheets.push(w);
    return w.id;
  });
}

/**
 * Paper Mode: the teacher ticks which questions a student got right.
 * Uses the same EXP/Mastery rules as online play (README D6).
 * Saving again replaces the earlier entry for that student.
 */
export function savePaperResult(worksheetId: string, studentId: string, questions: Question[], correctIndexes: number[]) {
  commit((d) => {
    d.attempts = d.attempts.filter((a) => !(a.worksheetId === worksheetId && a.studentId === studentId));
    d.paperResults = d.paperResults.filter((r) => !(r.worksheetId === worksheetId && r.studentId === studentId));
    questions.forEach((q, i) =>
      record(d, { studentId, question: q, correct: correctIndexes.includes(i), hintsUsed: 0, source: 'paper', worksheetId }),
    );
    d.paperResults.push({ id: id(), worksheetId, studentId, correctIndexes, at: now() });
  });
}
