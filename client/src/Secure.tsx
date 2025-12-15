import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext.js';
import { secure, logout, type UserData } from './api.js';

export const Secure = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSecureData = async () => {
      setLoading(true);
      const response = await secure();
      if (response.ok) {
        setUserData(response.user);
        setIsAuthed(true);
      }
      setLoading(false);
    }
    fetchSecureData();
  }, []);

  const { isAuthed, setIsAuthed } = useAppContext();

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsAuthed(false);
    navigate('/', { replace: true });
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <main className="container">
      <article>
        <h1>Secure Page</h1>
        <hr />
        <strong>UserId</strong>
        <p><small>{userData.id}</small></p>
        <strong>Email</strong>
        <p><small>{userData.email}</small></p>
        <strong>Password Hash</strong>
        <p><small>{userData.password_hash}</small></p>
        <strong>Created At</strong>
        <p><small>{userData.created_at}</small></p>
        <strong>Last Login</strong>
        <p><small>{userData.last_login}</small></p>
      </article>
      <footer className="container">
        {isAuthed && <button onClick={handleLogout}>Logout</button>}
      </footer>
    </main>
  );
};
