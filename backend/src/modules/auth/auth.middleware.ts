import type { NextFunction, Request, Response } from "express";

import type { AuthUser, User } from "../../types/auth.js";
import { findUserById } from "./user.repository.js";
import {
  sessionTokenFromCookieHeader,
  verifySessionToken,
} from "./session.js";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userFromRequest(request);

    if (!user) {
      response.status(401).json({
        code: "AUTH_REQUIRED",
        message: "Sign in to use cloud board storage.",
      });
      return;
    }

    response.locals.authUser = toAuthUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

export async function userFromRequest(request: Request): Promise<User | null> {
  const token = sessionTokenFromCookieHeader(request.headers.cookie);

  if (!token) {
    return null;
  }

  const userId = await verifySessionToken(token);
  return userId ? findUserById(userId) : null;
}

export function authUserFromResponse(response: Response): AuthUser {
  return response.locals.authUser as AuthUser;
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
