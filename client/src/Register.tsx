import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { register } from './api.js'

export const Register = ({ setIsAuthed }: { setIsAuthed: (value: boolean) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await secure();
      if (response.ok) {
        setIsAuthed(true);
      }
    }
    checkAuth();
  }, []);

  const navigate = useNavigate();

  const handleRegister = async (event: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    const result = await register(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Registration failed');
    } else {
      navigate('/');
    }
  };

  const inputs = (error: string) => {
    if (!error) {
      return (
        <>
          <small></small>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      );
    } else {
      return (
        <>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid="true"
            aria-describedby="valid-helper"
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid="true"
            aria-describedby="valid-helper"
          />
          <small id="valid-helper">{error}</small>
        </>
      );
    }
  };

  return (
    <main className="container">
      <article>
        <h1>Register</h1>
        <form onSubmit={handleRegister}>
          {inputs(error)}
          <button type="submit" disabled={loading} onClick={handleRegister}>
            Register
          </button>
        </form>
      </article>
    </main>
  );
}
