import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './useAppContext.js';
import { secure, logout, deactivate, type UserData } from './api.js';
import { Deactivate } from './Deactivate.js';

export const Secure = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [promptDeactivate, setPromptDeactivate] = useState<boolean>(false);

  const { isAuthed, setIsAuthed } = useAppContext();

  useEffect(() => {
    const fetchSecureData = async () => {
      setLoading(true);
      const response = await secure();
      if (response.ok && response.user) {
        setUserData(response.user);
        setIsAuthed(true);
      }
      setLoading(false);
    }
    fetchSecureData();
  }, [setIsAuthed]);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsAuthed(false);
    navigate('/', { replace: true });
  }

  const handleDeactivate = async () => {
    setPromptDeactivate(true);
  }

  const confirmDeactivate = async (password: string) => {
    await deactivate(password);
    setPromptDeactivate(false);
    await logout();
    setIsAuthed(false);
    navigate('/', { replace: true });
  }

  const getDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!userData) {
    return <div>No user data</div>
  }

  return (
    <main className="container">
      {promptDeactivate && (
        <Deactivate onConfirm={confirmDeactivate} onCancel={() => setPromptDeactivate(false)} />
      )}
      <article>
        <h1>Secure Page</h1>
        <hr />
        <strong>User ID</strong>
        <p><small>{userData.id}</small></p>
        <strong>Email</strong>
        <p><small>{userData.email}</small></p>
        <strong>Password Hash</strong>
        <p><small>{userData.password_hash}</small></p>
        <strong>Created At</strong>
        <p><small>{getDateTime(userData.created_at)}</small></p>
        <strong>Last Login</strong>
        <p><small>{getDateTime(userData.last_login)}</small></p>
      </article>
      <footer className="container">
        <fieldset role="group">
          {isAuthed && <button onClick={handleLogout}>Logout</button>}
          {isAuthed && <button className={'secondary'} onClick={handleDeactivate}>Deactivate</button>}
        </fieldset>
      </footer>
    </main>
  );
};
