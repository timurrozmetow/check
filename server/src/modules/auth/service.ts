import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users, type UserRow } from "../../db/schema";
import { unauthorized } from "../../shared/errors";

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
    throw unauthorized("Неверный email или пароль");
  }
  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) {
    throw unauthorized("Неверный email или пароль");
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
