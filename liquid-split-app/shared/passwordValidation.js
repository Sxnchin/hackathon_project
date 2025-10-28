// Shared password validation logic
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  patterns: {
    uppercase: /[A-Z]/,
    number: /\d/,
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
  }
};

export const validatePassword = (password) => {
  const checks = {
    length: password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: PASSWORD_REQUIREMENTS.patterns.uppercase.test(password),
    number: PASSWORD_REQUIREMENTS.patterns.number.test(password),
    special: PASSWORD_REQUIREMENTS.patterns.special.test(password)
  };

  const feedback = [];
  if (!checks.length) feedback.push("at least 8 characters");
  if (!checks.uppercase) feedback.push("one uppercase letter");
  if (!checks.number) feedback.push("one number");
  if (!checks.special) feedback.push("one special character (!@#$%^&*...)");

  const score = Object.values(checks).filter(Boolean).length;
  const isValid = feedback.length === 0;

  return {
    isValid,
    score,
    feedback,
    checks
  };
};