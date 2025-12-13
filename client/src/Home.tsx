import { useState, useEffect } from 'react';
import { secure, logout } from './api.js';

type UserData = { id: string, email: string, password_hash: string };

export function Home({ isAuthed, setIsAuthed }: { isAuthed: boolean, setIsAuthed: (value: boolean) => void }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthed) {
        setLoading(false);
        return;
      }

      try {
        const response = await secure();
        setUserData(response.user || null);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthed]);

  const handleLogout = async () => {
    await logout();
    setIsAuthed(false);
    setUserData(null);
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="home">
      <ul>
        {userData && (
        <>
          <li>{userData.id}</li>
          <li>{userData.email}</li>
          <li>{userData.password_hash}</li>
        </>
        )}
      </ul>
      {isAuthed && <button onClick={handleLogout}>Logout</button>}
    </div>
  );
};