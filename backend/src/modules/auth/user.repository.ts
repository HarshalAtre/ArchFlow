import type { User } from "../../types/auth.js";

import { UserModel } from "./user.schema.js";

export async function createUser(user: User): Promise<User> {
  const document = await UserModel.create(user);
  return toUser(document.toObject());
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const document = await UserModel.findOne({ email }).lean();
  return document ? toUser(document) : null;
}

export async function findUserById(userId: string): Promise<User | null> {
  const document = await UserModel.findOne({ id: userId }).lean();
  return document ? toUser(document) : null;
}

export async function findUsersByIds(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) {
    return [];
  }

  const documents = await UserModel.find({ id: { $in: userIds } }).lean();
  return documents.map(toUser);
}

function toUser(document: User & { _id?: unknown }): User {
  return {
    id: document.id,
    name: document.name,
    email: document.email,
    passwordHash: document.passwordHash,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
