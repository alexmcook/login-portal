import { useEffect, useState } from 'react'
import { resetPassword } from './api.js'
import { utils } from './utils.js'
import { Notice } from './Notice.js'

export const PasswordReset = ({ onCancel }: { onCancel: () => void }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showNotice, setShowNotice] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

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

    const { resetUrl } = await resetPassword(email);
    setResetUrl(resetUrl);
    setShowNotice(true);
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
        {showNotice && !resetUrl && <Notice message={"Please check your email to reset your password!"} />}
        {showNotice && resetUrl && <Notice message={"Because this email is not approved in the SES sandbox, a link will be shared directly."} url={resetUrl} />}
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
