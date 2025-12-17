export const utils = { validateEmail, validatePassword };

function validateEmail(email: string): boolean {
  if (email.length === 0) {
    return true;
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

function validatePassword(password: string): string {
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
