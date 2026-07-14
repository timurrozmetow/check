import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users, type UserRow } from "../../db/schema";
import { AppError, badRequest, unauthorized } from "../../shared/errors";
import { IMAGE_MIME_TYPES } from "../../shared/constants";
import {
  deleteUploadFile,
  saveOne,
  type IncomingFile,
} from "../files/service";

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

/** Загружает и ставит аватар текущему пользователю (использует уменьшенную копию). */
export async function setOwnAvatar(
  userId: number,
  part: IncomingFile,
): Promise<PublicUser> {
  if (!IMAGE_MIME_TYPES.includes(part.mimetype)) {
    part.file.resume(); // слить поток, чтобы multipart не завис
    throw badRequest("error.unsupportedFileType", "UNSUPPORTED_TYPE");
  }
  const saved = await saveOne(part);
  // Для аватара достаточно уменьшенной webp-копии; полноразмерный оригинал удаляем.
  let url: string;
  if (saved.thumbRelPath) {
    await deleteUploadFile(`/uploads/${saved.relPath}`);
    url = `/uploads/${saved.thumbRelPath}`;
  } else {
    url = `/uploads/${saved.relPath}`;
  }

  const old = await getUserById(userId);
  await db.update(users).set({ avatar: url }).where(eq(users.id, userId));
  if (old?.avatar) await deleteUploadFile(old.avatar);

  const updated = await getUserById(userId);
  if (!updated) throw unauthorized();
  return toPublicUser(updated);
}

/** Убирает аватар текущего пользователя. */
export async function removeOwnAvatar(userId: number): Promise<PublicUser> {
  const old = await getUserById(userId);
  await db.update(users).set({ avatar: null }).where(eq(users.id, userId));
  if (old?.avatar) await deleteUploadFile(old.avatar);

  const updated = await getUserById(userId);
  if (!updated) throw unauthorized();
  return toPublicUser(updated);
}
