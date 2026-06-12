import { randomUUID } from "node:crypto";

import { Router } from "express";

import { asyncHandler } from "../../http/async-handler.js";
import type { User } from "../../types/auth.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "./session.js";
import { toAuthUser, userFromRequest } from "./auth.middleware.js";
import {
  createUser,
  findUserByEmail,
} from "./user.repository.js";
import {
  validateLoginInput,
  validateRegistrationInput,
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.get("/me", asyncHandler(async (request, response) => {
  const user = await userFromRequest(request);

  if (!user) {
    response.json({ user: null });
    return;
  }

  response.json({ user: toAuthUser(user) });
}));

authRouter.post("/register", asyncHandler(async (request, response) => {
  const { data, errors } = validateRegistrationInput(request.body);

  if (!data) {
    response.status(400).json({ errors });
    return;
  }

  if (await findUserByEmail(data.email)) {
    response.status(409).json({ message: "An account already exists for this email." });
    return;
  }

  const now = new Date().toISOString();
  const user: User = {
    id: randomUUID(),
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    createdAt: now,
    updatedAt: now,
  };
  const createdUser = await createUser(user);
  const token = await createSessionToken(createdUser.id);

  setSessionCookie(response, token);
  response.status(201).json({ user: toAuthUser(createdUser) });
}));

authRouter.post("/login", asyncHandler(async (request, response) => {
  const { data, errors } = validateLoginInput(request.body);

  if (!data) {
    response.status(400).json({ errors });
    return;
  }

  const user = await findUserByEmail(data.email);
  const passwordMatches =
    user && (await verifyPassword(data.password, user.passwordHash));

  if (!user || !passwordMatches) {
    response.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const token = await createSessionToken(user.id);
  setSessionCookie(response, token);
  response.json({ user: toAuthUser(user) });
}));

authRouter.post("/logout", (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});
