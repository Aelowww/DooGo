/** Password rules for new accounts and password changes. */
export type PasswordRule = { id: string; label: string; test: (password: string) => boolean };

export const minPasswordLength = 8;

export const passwordRules: PasswordRule[] = [
  { id: "length", label: `At least ${minPasswordLength} characters`, test: (password) => password.length >= minPasswordLength },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (password) => /[A-Z]/.test(password) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (password) => /[a-z]/.test(password) },
  { id: "number", label: "A number (0–9)", test: (password) => /\d/.test(password) },
  { id: "symbol", label: "A symbol (e.g. ! @ # $)", test: (password) => /[^A-Za-z0-9\s]/.test(password) },
  { id: "spaces", label: "No spaces", test: (password) => password.length > 0 && !/\s/.test(password) },
];

/** Words from the user's name and email that shouldn't appear in their password. */
function personalWords(context: { name?: string; email?: string }) {
  const emailName = context.email?.split("@")[0] ?? "";
  return [...(context.name ?? "").split(/\s+/), ...emailName.split(/[._\-+\d]+/)]
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 3);
}

export function containsPersonalInfo(password: string, context: { name?: string; email?: string }) {
  const lower = password.toLowerCase();
  return personalWords(context).some((word) => lower.includes(word));
}

/** First problem with the password, or "" when it meets every rule. */
export function passwordProblem(password: string, context: { name?: string; email?: string } = {}) {
  const failed = passwordRules.find((rule) => !rule.test(password));
  if (failed) return `Password needs: ${failed.label.toLowerCase()}.`;
  if (containsPersonalInfo(password, context)) return "Password shouldn't contain your name or email.";
  return "";
}

/** 0–4 for the strength meter: rules met, plus a bonus for length. */
export function passwordStrength(password: string, context: { name?: string; email?: string } = {}) {
  if (!password) return 0;
  const met = passwordRules.filter((rule) => rule.test(password)).length;
  let score = met <= 2 ? 1 : met <= 4 ? 2 : met === passwordRules.length ? 3 : 2;
  if (score === 3 && password.length >= 12) score = 4;
  if (containsPersonalInfo(password, context)) score = Math.min(score, 1);
  return score;
}

export const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"] as const;
