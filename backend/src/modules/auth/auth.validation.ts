export type AuthInput = {
  email: string;
  name: string;
  password: string;
};

export function validateRegistrationInput(value: unknown): {
  data?: AuthInput;
  errors: string[];
} {
  const input = isRecord(value) ? value : {};
  const name = cleanString(input.name);
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const errors: string[] = [];

  if (name.length < 2 || name.length > 60) {
    errors.push("Name must be between 2 and 60 characters.");
  }

  if (!isValidEmail(email)) {
    errors.push("Enter a valid email address.");
  }

  if (password.length < 8 || password.length > 128) {
    errors.push("Password must be between 8 and 128 characters.");
  }

  return {
    data: errors.length === 0 ? { name, email, password } : undefined,
    errors,
  };
}

export function validateLoginInput(value: unknown): {
  data?: Pick<AuthInput, "email" | "password">;
  errors: string[];
} {
  const input = isRecord(value) ? value : {};
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const errors: string[] = [];

  if (!isValidEmail(email) || !password) {
    errors.push("Enter your email and password.");
  }

  return {
    data: errors.length === 0 ? { email, password } : undefined,
    errors,
  };
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
