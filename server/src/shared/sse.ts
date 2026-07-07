import type { FastifyReply } from "fastify";

/**
 * Простая in-memory шина SSE: userId → открытые соединения.
 * При деплое в один процесс PM2 (fork) этого достаточно.
 */
const clients = new Map<number, Set<FastifyReply>>();

export function addSseClient(userId: number, reply: FastifyReply) {
  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(reply);
}

export function removeSseClient(userId: number, reply: FastifyReply) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(reply);
  if (set.size === 0) clients.delete(userId);
}

/** Отправить событие всем открытым соединениям пользователя. */
export function pushSse(userId: number, event: string, data: unknown) {
  const set = clients.get(userId);
  if (!set) return;
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const reply of set) {
    reply.raw.write(frame);
  }
}
