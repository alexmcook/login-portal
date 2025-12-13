import { useEffect, useState } from 'react'
import { login, register, secure } from './api.js'
import './Login.css'

export function Login({ setIsAuthed }: { setIsAuthed: (value: boolean) => void }) {
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

  const handleLogin = async (event: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Login failed');
    } else {
      setIsAuthed(true);
    }
  };

  const handleRegister = async (event: React.MouseEvent<HTMLButtonElement>) => {
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
      setIsAuthed(true);
    }
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>
      {error && <div className="error">{error}</div>}
      <input
        className="form-group"
        type="email"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="form-group"
        type="password"
        placeholder="Password"
        autoComplete="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="form-group">
        <button className="form-btn" type="submit" disabled={loading} onClick={handleLogin}>
          Login
        </button>
        <button className="form-btn" type="button" disabled={loading} onClick={handleRegister}>
          Register
        </button>
      </div>
    </form>
  );
}