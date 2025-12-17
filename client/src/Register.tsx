import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { register } from './api.js'

export const Register = ({ setIsAuthed }: { setIsAuthed: (value: boolean) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
    if (emailError || passwordError) {
      return;
    }
    setLoading(true);
    const result = await register(email, password);
    setLoading(false);
    if (!result.ok) {
      setPasswordError('Registration failed: ' + (result.error || 'unknown error'));
    } else {
      navigate('/');
    }
  };

  const validateEmail = (email: string): boolean => {
    if (email.length === 0) {
      return true;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  }

  const validatePassword = (password: string): string => {
    // Password must contain at least one number, one lowercase letter, one uppercase letter, one special character, and be at least 8 characters long
    if (password.length === 0) {
      return '';
    }
    const hasNumber = /[0-9]/.test(password);
    if (!hasNumber) {
      return 'Password must contain at least one number';
    }
    const hasLower = /[a-z]/.test(password);
    if (!hasLower) {
      return 'Password must contain at least one lowercase letter';
    }
    const hasUpper = /[A-Z]/.test(password);
    if (!hasUpper) {
      return 'Password must contain at least one uppercase letter';
    }
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasSpecial) {
      return 'Password must contain at least one special character';
    }
    const hasLength = /^.{8,}$/.test(password);
    if (!hasLength) {
      return 'Password must be at least 8 characters long';
    }
    return '';
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (!validateEmail(e.target.value)) {
      setEmailError('Invalid email format');
    } else {
      setEmailError('');
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    const error = validatePassword(e.target.value);
    if (error) {
      setPasswordError(error);
    } else {
      setPasswordError('');
    }
  }

  return (
    <main className="container">
      <article>
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
          aria-invalid={passwordError.length > 0 ? "true" : undefined}
          aria-describedby="password-valid"
        />
        <small id="password-valid">{passwordError}</small>
          <button type="submit" disabled={loading || emailError || passwordError} onClick={handleRegister}>
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
