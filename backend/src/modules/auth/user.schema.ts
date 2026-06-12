import { Schema, model } from "mongoose";

import type { User } from "../../types/auth.js";

const userSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "users",
    versionKey: false,
  },
);

export const UserModel = model<User>("User", userSchema);
