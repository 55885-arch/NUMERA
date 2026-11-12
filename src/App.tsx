import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { currentUser, logout, useDB } from './data/store';
import { Link, go } from './components/ui';
import { Login } from './pages/Login';
import { StudentHome } from './pages/StudentHome';
import { FieldPage } from './pages/FieldPage';
import { DungeonPage } from './pages/DungeonPage';
import { TeacherHome } from './pages/TeacherHome';
import { ClassPage } from './pages/ClassPage';
import { PrintWorksheet } from './pages/PrintWorksheet';

function useHashPath(): string {
  const read = () => window.location.hash.slice(1) || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function App() {
  const db = useDB();
  const user = currentUser(db);
  const parts = useHashPath().split('/').filter(Boolean);
  // Students play in the ink theme (the game world); teachers work on paper.
  const theme = user?.role === 'teacher' ? 'theme-paper' : 'theme-ink';

  useEffect(() => {
    document.body.style.background = theme === 'theme-paper' ? '#f7f4ee' : '#0b0d14';
  }, [theme]);

  if (user?.role === 'teacher' && parts[0] === 'print' && parts[1]) {
    return (
      <div className="theme-paper">
        <PrintWorksheet user={user} worksheetId={parts[1]} showKey={parts[2] === 'key'} />
      </div>
    );
  }

  let page;
  if (!user) page = <Login />;
  else if (user.role === 'teacher') {
    page = parts[1] === 'class' && parts[2] ? <ClassPage user={user} classId={parts[2]} /> : <TeacherHome user={user} />;
  } else if (parts[1] === 'field') page = <FieldPage user={user} />;
  else if (parts[1] === 'dungeon' && parts[2]) page = <DungeonPage user={user} assignmentId={parts[2]} />;
  else page = <StudentHome user={user} />;

  return (
    <div className={`app ${theme}`}>
      <header className="topbar">
        <Link to={user ? (user.role === 'teacher' ? '/teacher' : '/student') : '/'} className="brand">
          <span className="brand-mark" aria-hidden>
            ±
          </span>
          NUMERA
        </Link>
        {user && (
          <div className="topbar-user">
            <span className="role-tag">{user.role === 'teacher' ? 'ครู' : 'นักเรียน'}</span>
            <span className="user-name">{user.name}</span>
            <button
              className="btn ghost small-btn"
              onClick={() => {
                logout();
                go('/');
              }}
            >
              <LogOut className="icon" aria-hidden />
              ออกจากระบบ
            </button>
          </div>
        )}
      </header>
      <main>{page}</main>
    </div>
  );
}
