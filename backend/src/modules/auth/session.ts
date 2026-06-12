import type { Response } from "express";
import { SignJWT, jwtVerify } from "jose";

import { env } from "../../config/env.js";

export const sessionCookieName = "archflow_session";

const sessionDurationSeconds = 60 * 60 * 24 * 7;
const signingKey = new TextEncoder().encode(env.authSecret);

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(signingKey);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey, {
      algorithms: ["HS256"],
    });

    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionDurationSeconds * 1000,
    path: "/",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production",
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    path: "/",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production",
  });
}

export function sessionTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === sessionCookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}
