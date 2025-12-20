import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom';
import { utils } from './utils.js'
import { updatePassword } from './api.js'
import { Notice } from './Notice.js';

export const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorTop, setErrorTop] = useState('');
  const [errorBottom, setErrorBottom] = useState('');
  const [searchParams] = useSearchParams();
  const [showNotice, setShowNotice] = useState(false);
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (e.target.value.length === 0) {
      setErrorTop('');
      return;
    }
    const error = utils.validatePassword(e.target.value);
    if (error) {
      setErrorTop(error);
    } else {
      setErrorTop('');
    }

    if (confirmPassword && e.target.value !== confirmPassword) {
      setErrorBottom('Passwords do not match');
    } else {
      setErrorBottom('');
    }
  }

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (e.target.value.length === 0) {
      setErrorBottom('');
      return;
    }
    if (e.target.value !== password) {
      setErrorBottom('Passwords do not match');
    } else {
      setErrorBottom('');
    }
  }

  const handleUpdatePassword = async () => {
    const passwordError = utils.validatePassword(password);
    const confirmPasswordError = password !== confirmPassword ? 'Passwords do not match' : '';
    if (passwordError || confirmPasswordError) {
      setErrorTop(passwordError || '');
      setErrorBottom(confirmPasswordError || '');
      return;
    }
    const result = await updatePassword(token, password);
    if (!result.ok) {
      setErrorBottom(`Error: ${result.error}`);
    } else {
      setShowNotice(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    }
  }

  return (
    <main className="container">
      <article>
        {showNotice && <Notice message={"Password successfully updated."} />}
        <form method="dialog">
          <h2>Update Password</h2>
          <input
            type="password"
            placeholder="New Password"
            autoComplete="new-password"
            value={password}
            onChange={handlePasswordChange}
            aria-invalid={errorTop ? "true" : undefined}
            aria-describedby="password-valid"
          />
          <small id="password-valid">{errorTop}</small>
          <input
            type="password"
            placeholder="Confirm New Password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            aria-invalid={errorBottom ? "true" : undefined}
            aria-describedby="confirm-password-valid"
          />
          <small id="confirm-password-valid">{errorBottom}</small>
          <button type="submit" onClick={handleUpdatePassword}>Submit</button>
        </form>
      </article>
    </main>
  );
};
