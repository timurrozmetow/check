import cron from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { env } from "./env";
import { runDeadlineCheck } from "./deadline-reminders";

/**
 * Запускает планировщик напоминаний о дедлайнах.
 * Выполняется по расписанию DEADLINE_CRON и один раз при старте.
 */
export function startScheduler(log: FastifyBaseLogger) {
  async function tick() {
    try {
      const count = await runDeadlineCheck();
      if (count > 0) {
        log.info(`Напоминания о дедлайнах отправлены по ${count} задаче(ам)`);
      }
    } catch (err) {
      log.error({ err }, "Ошибка планировщика дедлайнов");
    }
  }

  if (!cron.validate(env.DEADLINE_CRON)) {
    log.warn(`Некорректное DEADLINE_CRON: ${env.DEADLINE_CRON}, планировщик выключен`);
    return;
  }

  const task = cron.schedule(env.DEADLINE_CRON, tick);
  // Первый прогон вскоре после старта (не блокируя запуск сервера)
  setTimeout(() => void tick(), 5_000);

  return task;
}
