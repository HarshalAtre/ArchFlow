export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = Pick<User, "id" | "name" | "email">;
