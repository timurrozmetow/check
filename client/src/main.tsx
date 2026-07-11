import React from "react";
import ReactDOM from "react-dom/client";
import {
  QueryClient,
  QueryCache,
  QueryClientProvider,
} from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequestError } from "@/api/client";
import App from "./App";
import "@/i18n";
import "./index.css";

const queryClient = new QueryClient({
  // Ни одна ошибка загрузки не должна оставаться незамеченной (иначе списки
  // показывают «пусто» вместо сбоя). 401 — часть auth-потока, его не шумим.
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof RequestError && error.status === 401) return;
      toast.error(
        error instanceof RequestError
          ? error.message
          : "Не удалось загрузить данные",
      );
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <TooltipProvider delayDuration={300}>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
