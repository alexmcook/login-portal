import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { register, secure } from './api.js'
import { Notice } from './Notice.js'
import { utils } from './utils.js';

export const Register = ({ setIsAuthed }: { setIsAuthed: (value: boolean) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activationUrl, setActivationUrl] = useState('');
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await secure();
      if (response.ok) {
        setIsAuthed(true);
      }
    }
    checkAuth();
  }, [setIsAuthed]);

  const navigate = useNavigate();

  const handleRegister = async (event: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.length === 0) {
      setEmailError('Email is required');
    }
    if (password.length === 0) {
      setPasswordError('Password is required');
    }
    if (emailError || passwordError || email.length === 0 || password.length === 0) {
      return;
    }
    setLoading(true);
    const result = await register(email, password);
    setLoading(false);
    if (!result.ok) {
      setPasswordError('Registration failed: ' + (result.error ?? 'unknown error'));
    } else {
      setActivationUrl(result.activationUrl);
      setShowNotice(true);
      //navigate('/');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (!utils.validateEmail(e.target.value)) {
      setEmailError('Invalid email format');
    } else {
      setEmailError('');
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    const error = utils.validatePassword(e.target.value);
    if (error) {
      setPasswordError(error);
    } else {
      setPasswordError('');
    }
  }

  return (
    <main className="container">
      <article>
        {showNotice && !activationUrl && <Notice message={"Please check your email to activate your account!"} />}
        {showNotice && activationUrl && <Notice message={"Because this email is not approved in the SES sandbox, a link will be shared directly."} url={activationUrl} />}
        <h1>Register</h1>
        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            aria-invalid={emailError ? "true" : undefined}
            aria-describedby="email-valid"
          />
          <small id="email-valid">{emailError}</small>
          <input
            type="password"
            placeholder="Password"
            autoComplete="password"
            value={password}
            onChange={handlePasswordChange}
            aria-invalid={passwordError ? "true" : undefined}
            aria-describedby="password-valid"
          />
          <small id="password-valid">{passwordError}</small>
          <button type="submit" disabled={loading} onClick={handleRegister}>
            Register
          </button>
        </form>
      </article>
      <hr />
      <footer className="container">
        <button onClick={() => navigate('/')}>Back</button>
      </footer>
    </main>
  );
}
