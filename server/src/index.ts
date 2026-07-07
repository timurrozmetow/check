import { buildApp } from "./app";
import { env } from "./shared/env";
import { startScheduler } from "./shared/scheduler";

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  startScheduler(app.log);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
