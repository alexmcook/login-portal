import { useEffect, useState } from 'react'

export const Deactivate = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleCancel = () => {
    onCancel(false);
  };

  const handleDeactivate = async () => {
    if (password.length === 0) {
      setError('Password is required');
      return;
    }
    onConfirm(password);
  };

  return (
    <dialog open>
      <form method="dialog">
        <h2>Deactivate Account</h2>
        <p>Are you sure you want to deactivate your account? This action cannot be undone.</p>
        <p>Enter your password to continue.</p>
        <input
          type="password"
          placeholder="Password"
          autoComplete="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby="password-valid"
        />
        <small id="password-valid">{error}</small>
        <fieldset role="group"> 
          <button type="button" className={'secondary'} onClick={handleCancel}>Cancel</button>
          <button type="button" onClick={handleDeactivate}>Deactivate</button>
        </fieldset>
      </form>
    </dialog>
  );
};
