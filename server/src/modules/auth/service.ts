import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users, type UserRow } from "../../db/schema";
import { AppError, unauthorized } from "../../shared/errors";

export type PublicUser = Omit<UserRow, "passwordHash">;

export function toPublicUser(user: UserRow): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<UserRow> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.isActive) {
    throw unauthorized("error.invalidCredentials");
  }
  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) {
    throw unauthorized("error.invalidCredentials");
  }
  return user;
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function changeOwnPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await getUserById(userId);
  if (!user) throw unauthorized();
  const ok = await argon2.verify(user.passwordHash, currentPassword);
  if (!ok) {
    throw new AppError(400, "WRONG_PASSWORD", "error.wrongPassword");
  }
  const passwordHash = await argon2.hash(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
