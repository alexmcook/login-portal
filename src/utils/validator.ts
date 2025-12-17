export function validateEmail(email: string): boolean {
  if (email.length === 0) {
    return false;
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

export function validatePassword(password: string): boolean {
  // Password must contain at least one number, one lowercase letter, one uppercase letter, one special character, and be at least 8 characters long
  if (password.length === 0) {
    return false;
  }
  const hasNumber = /[0-9]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasLength = /^.{8,}$/.test(password);
  return hasNumber && hasLower && hasUpper && hasSpecial && hasLength;
}
