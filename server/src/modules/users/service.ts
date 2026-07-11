import argon2 from "argon2";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users } from "../../db/schema";
import { AppError, notFound } from "../../shared/errors";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "./schemas";

/** Публичные колонки пользователя (без passwordHash). */
const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  avatar: users.avatar,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: (typeof users.$inferSelect)["role"];
  avatar: string | null;
  isActive: boolean;
  createdAt: Date;
};

export async function listUsers(): Promise<PublicUser[]> {
  return db.select(publicColumns).from(users).orderBy(asc(users.name));
}

async function getPublicUser(id: number): Promise<PublicUser> {
  const [user] = await db
    .select(publicColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) throw notFound("error.userNotFound");
  return user;
}

async function assertEmailFree(email: string, exceptId?: number) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing && existing.id !== exceptId) {
    throw emailTaken();
  }
}

function emailTaken() {
  return new AppError(409, "EMAIL_TAKEN", "error.emailTaken");
}

/** Гонка: два запроса прошли assertEmailFree до коммита — ловим уникальный индекс. */
function isDuplicateEmailError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  await assertEmailFree(input.email);
  const passwordHash = await argon2.hash(input.password);
  try {
    const [inserted] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      })
      .$returningId();
    return getPublicUser(inserted!.id);
  } catch (e) {
    if (isDuplicateEmailError(e)) throw emailTaken();
    throw e;
  }
}

export async function updateUser(
  id: number,
  input: UpdateUserInput,
  currentUserId: number,
): Promise<PublicUser> {
  await getPublicUser(id); // 404, если нет

  if (input.email) {
    await assertEmailFree(input.email, id);
  }
  if (input.isActive === false && id === currentUserId) {
    throw new AppError(
      400,
      "CANNOT_DEACTIVATE_SELF",
      "error.cannotDeactivateSelf",
    );
  }

  try {
    await db
      .update(users)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(users.id, id));
  } catch (e) {
    if (isDuplicateEmailError(e)) throw emailTaken();
    throw e;
  }

  return getPublicUser(id);
}

export async function resetPassword(id: number, password: string) {
  await getPublicUser(id);
  const passwordHash = await argon2.hash(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}
