import { useEffect, useState } from 'react'
import { useAppContext } from './useAppContext.js';
import { useNavigate } from 'react-router-dom';
import { login, secure } from './api.js'
import { PasswordReset } from './PasswordReset.js';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptResetPassword, setPromptResetPassword] = useState(false);

  const navigate = useNavigate();
  const { setIsAuthed } = useAppContext();

  useEffect(() => {
    const checkAuth = async () => {
      const response = await secure();
      if (response.ok) {
        setIsAuthed(true);
        navigate('/secure', { replace: true });
      }
    }
    checkAuth();
  }, []);

  const handleLogin = async (event: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailError = email.length === 0 ? 'Email is required' : '';
    const passwordError = password.length === 0 ? 'Password is required' : '';
    setEmailError(emailError);
    setPasswordError(passwordError);
    if (emailError || passwordError) {
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setPasswordError(result.error || 'Login failed');
    } else {
      setIsAuthed(true);
      navigate('/secure', { replace: true });
    }
  };

  const handleResetPassword = async () => {
    setPromptResetPassword(true);
  }

  return (
    <main className="container">
      {promptResetPassword && <PasswordReset onCancel={() => setPromptResetPassword(false)} />}
      <article>
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? "true" : undefined}
            aria-describedby="email-valid"
          />
          <small id="email-valid">{emailError}</small>
          <input
            type="password"
            placeholder="Password"
            autoComplete="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={passwordError ? "true" : undefined}
            aria-describedby="password-valid"
          />
          <small id="password-valid">{passwordError}</small>
          <fieldset role="group"> 
            <button type="button" className={'secondary'} onClick={handleResetPassword}>Reset Password</button>
            <button type="submit" onClick={handleLogin}>{loading ? "Loading..." : "Submit"}</button>
          </fieldset>
        </form>
      </article>
    </main>
  );
}
