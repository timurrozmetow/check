import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";

// WASM-рендерер хостим локально из public/ (не тянем с CDN — работает офлайн,
// не ломается CSP). Файл: client/public/dotlottie-player.wasm.
// При обновлении @lottiefiles/dotlottie-web пересними этот файл.
setWasmUrl("/dotlottie-player.wasm");

/** Пути к анимациям (public/animation). */
export const ANIM = {
  success: "/animation/Success.lottie",
  fail: "/animation/False.lottie",
  loading: "/animation/Loading.lottie",
  notFound: "/animation/Error404.lottie",
} as const;

/** Обёртка над dotLottie-плеером. */
export function Lottie({
  src,
  loop = true,
  autoplay = true,
  className,
  onComplete,
}: {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  onComplete?: () => void;
}) {
  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={autoplay}
      className={className}
      dotLottieRefCallback={(dl) => {
        if (dl && onComplete) dl.addEventListener("complete", onComplete);
      }}
    />
  );
}
