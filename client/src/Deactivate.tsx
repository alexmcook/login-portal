import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deactivate, logout } from './api.js';

export const Deactivate = ({ password }: { password: string }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const deactivateAccount = async () => {
      setMessage('Deactivating your account, please wait...');
      try {
        const res = await deactivate(password);
        if (!res.ok) {
          setStatus('error');
          setMessage(res.error || 'Deactivation failed');
          return;
        }
        await logout();
        setStatus('success');
        setMessage('Your account has been successfully deactivated.');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage('Deactivation failed');
      }
    };

    deactivateAccount();
  }, [navigate, password]);

  return (
    <main className="container">
      <article>
        <h1>Deactivation</h1>
        <hr />
        <>
          {status === 'success' && <p>{message}</p>}
          {status === 'error' && <p>{message}</p>}
        </>
      </article>
    </main>
  );
};
