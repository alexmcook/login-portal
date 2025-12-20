import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { activate } from './api.js';

export const Activate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const activateAccount = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid activation token');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
        return;
      }

      setStatus('loading');
      setMessage('Activating your account, please wait...');
      const response = await activate(token);
      if (response.ok) {
        setStatus('success');
        setMessage('Your account has been successfully activated. You can now log in.');
      } else {
        setStatus('error');
        setMessage(response.error || 'Activation failed');
      }
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    };

    activateAccount();
  }, [navigate, token]);

  return (
    <main className="container">
      <article>
        <h1>Activation</h1>
        <hr />
        <>
          {status === 'loading' && <p>Loading...</p>}
          {status === 'success' && <p>{message}</p>}
          {status === 'error' && <p>{message}</p>}
        </>
      </article>
    </main>
  );
};
