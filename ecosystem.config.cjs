// PM2-конфигурация для продакшена.
// Запуск: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "directorhub-api",
      cwd: "./server",
      script: "dist/index.js",
      instances: 1, // SSE-шина in-memory — держим один процесс (fork)
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
    },
  ],
};
