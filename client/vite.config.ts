import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Стабильные vendor-чанки для кэша. ВАЖНО про циклы между чанками:
        // делить node_modules можно только так, чтобы не возникло взаимного
        // импорта чанков (иначе Rollup выдаёт «Circular chunk» и в рантайме
        // падает TDZ «Cannot access 'x' before initialization» → белый экран).
        // Поэтому react-vendor = ТОЛЬКО ядро React (react/react-dom/scheduler):
        // оно ничего не импортирует из vendor, значит это «лист» графа, и ребро
        // vendor→react-vendor одностороннее — цикл невозможен. Всё остальное
        // (в т.ч. react-router-dom, framer, radix — они зависят от vendor-пакетов)
        // складываем в единый стабильный vendor.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  // Тот же прокси при запуске собранной сборки (vite preview)
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
