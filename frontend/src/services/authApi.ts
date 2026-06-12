import type { AuthUser } from "../types/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type AuthCredentials = {
  email: string;
  password: string;
};

type RegistrationDetails = AuthCredentials & {
  name: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error("Could not check the current session.");
  }

  return body?.user ? (body.user as AuthUser) : null;
}

export async function login(
  credentials: AuthCredentials,
): Promise<AuthUser> {
  return sendAuthRequest("/api/auth/login", credentials);
}

export async function register(
  details: RegistrationDetails,
): Promise<AuthUser> {
  return sendAuthRequest("/api/auth/register", details);
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("Could not sign out.");
  }
}

async function sendAuthRequest(
  path: string,
  body: object,
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseAuthResponse(response);
}

async function parseAuthResponse(response: Response): Promise<AuthUser> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.errors) && typeof body.errors[0] === "string"
          ? body.errors[0]
          : "Authentication request failed.";

    throw new Error(message);
  }

  if (!body?.user) {
    throw new Error("Authentication response did not include a user.");
  }

  return body.user as AuthUser;
}
