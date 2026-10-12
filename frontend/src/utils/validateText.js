// Frontend mirror of the backend checks - rejects values that are ONLY
// digits for fields that should be human-readable text, and enforces
// minimum lengths. Client-side only (for instant feedback); the backend
// re-checks everything regardless.
export function isPureNumber(value) {
  return typeof value === 'string' && /^\d+$/.test(value.trim());
}

export function textFieldError(value, label, minLength = 1) {
  if (!value || !value.trim()) return `${label} is required.`;
  if (isPureNumber(value)) return `${label} must be text (e.g. a name or description), not just a number.`;
  if (value.trim().length < minLength) {
    return `${label} must be at least ${minLength} character${minLength === 1 ? '' : 's'} long.`;
  }
  return null;
}

// Q1: ID fields (Staff ID, Student ID, etc) - length 5-12, any characters.
export function idFieldError(value, label = 'ID') {
  if (!value || !String(value).trim()) return `${label} is required.`;
  const len = String(value).trim().length;
  if (len < 5 || len > 12) return `${label} must be between 5 and 12 characters long.`;
  return null;
}

// Q5: expected graduation date for students - required, must be a real
// calendar date (year/month/day), and must be in the future (a graduation
// date in the past would mean the student is created already-expired).
export function graduationDateError(value, label = 'Expected graduation date') {
  if (!value) return `${label} is required.`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return `${label} must be a valid date.`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d <= today) return `${label} must be a date in the future.`;
  return null;
}
export function passwordStrengthError(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}
