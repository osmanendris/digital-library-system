// Rejects values that are ONLY digits (e.g. "12345") for fields that should
// be human-readable text (names, titles, subjects, descriptions, etc).
// A value with any letter/space/punctuation in it passes fine.
function isPureNumber(value) {
  return typeof value === 'string' && /^\d+$/.test(value.trim());
}

// Returns an error message string if the field fails, or null if it's fine.
// minLength defaults to 1 (just "required") - pass a higher number to also
// enforce a minimum length (Q1: full names >=5, departments/categories >=2
// or >=5, resource request fields >=3, rejection reasons >=10, etc).
function textFieldError(value, label, minLength = 1) {
  if (!value || !value.trim()) return `${label} is required.`;
  if (isPureNumber(value)) return `${label} must be text (e.g. a name or description), not just a number.`;
  if (value.trim().length < minLength) {
    return `${label} must be at least ${minLength} character${minLength === 1 ? '' : 's'} long.`;
  }
  return null;
}

// Q1: Staff/Student/Teacher ID etc - length must be 5-12, but NO
// restriction on whether it's letters, numbers, or a mix (unlike names,
// IDs are often pure numbers, e.g. "202301234").
function idFieldError(value, label = 'ID') {
  if (!value || !String(value).trim()) return `${label} is required.`;
  const len = String(value).trim().length;
  if (len < 5 || len > 12) return `${label} must be between 5 and 12 characters long.`;
  return null;
}

// Q2: password strength - at least 8 characters, with at least one
// uppercase letter, one lowercase letter, one digit, and one special
// character. Applied everywhere a password is set: account creation,
// self-service change-password, and OTP-based reset.
function passwordStrengthError(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}

// Q5: expected graduation date for students - required, must be a real
// calendar date (year/month/day), and must be in the future (a graduation
// date in the past would mean the student is created already-expired).
function graduationDateError(value, label = 'Expected graduation date') {
  if (!value) return `${label} is required.`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return `${label} must be a valid date.`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d <= today) return `${label} must be a date in the future.`;
  return null;
}

module.exports = { isPureNumber, textFieldError, idFieldError, passwordStrengthError, graduationDateError };
