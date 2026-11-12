import { useEffect, useState } from 'react';
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

  if (user?.role === 'teacher' && parts[0] === 'print' && parts[1]) {
    return <PrintWorksheet user={user} worksheetId={parts[1]} showKey={parts[2] === 'key'} />;
  }

  let page;
  if (!user) page = <Login />;
  else if (user.role === 'teacher') {
    page = parts[1] === 'class' && parts[2] ? <ClassPage user={user} classId={parts[2]} /> : <TeacherHome user={user} />;
  } else if (parts[1] === 'field') page = <FieldPage user={user} />;
  else if (parts[1] === 'dungeon' && parts[2]) page = <DungeonPage user={user} assignmentId={parts[2]} />;
  else page = <StudentHome user={user} />;

  return (
    <>
      <header className="topbar">
        <Link to={user ? (user.role === 'teacher' ? '/teacher' : '/student') : '/'} className="brand">
          <span aria-hidden>✨</span> NUMERA
        </Link>
        {user && (
          <div className="topbar-user">
            <span className="badge role">{user.role === 'teacher' ? 'ครู' : 'นักเรียน'}</span>
            <span className="user-name">{user.name}</span>
            <button
              className="btn ghost small-btn"
              onClick={() => {
                logout();
                go('/');
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </header>
      <main>{page}</main>
    </>
  );
}
