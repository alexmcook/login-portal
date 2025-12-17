import { useEffect, useState } from 'react'
import { resetPassword } from './api.js'
import { utils } from './utils.js'

export const PasswordReset = ({ onCancel }: { onCancel: () => void }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleCancel = () => {
    onCancel(false);
  };

  const handleResetPassword = async () => {
    if (email.length === 0) {
      setError('Email is required');
      return;
    }

    const valid = utils.validateEmail(email);
    if (!valid) {
      setError('Invalid email');
      return;
    }

    await resetPassword(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (!utils.validateEmail(e.target.value)) {
      setError('Invalid email format');
    } else {
      setError('');
    }
  }


  return (
    <dialog open>
      <article>
        <form method="dialog">
          <h2>Password Reset</h2>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            aria-invalid={error ? "true" : undefined}
            aria-describedby="email-valid"
          />
          <small id="email-valid">{error}</small>
          <fieldset role="group"> 
            <button type="button" className={'secondary'} onClick={handleCancel}>Cancel</button>
            <button type="button" onClick={handleResetPassword}>Submit</button>
          </fieldset>
        </form>
      </article>
    </dialog>
  );
};
