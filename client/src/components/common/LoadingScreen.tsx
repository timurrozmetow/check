import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Lottie, ANIM } from "./Lottie";

/**
 * Полноэкранный лоадер. Lottie-плеер грузит ~1.8МБ WASM + саму анимацию,
 * поэтому первые доли секунды его канвас пуст (белый экран). Чтобы этого
 * не было, мгновенно показываем лёгкий CSS-спиннер, а Lottie плавно
 * проявляем поверх, как только он готов к отрисовке.
 */
export function LoadingScreen() {
  const [ready, setReady] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Мгновенный спиннер — виден сразу, исчезает, когда Lottie готов */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="spinner"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 grid place-items-center"
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lottie проявляется поверх спиннера по событию load */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute inset-0 grid place-items-center"
      >
        <Lottie
          src={ANIM.loading}
          speed={0.9}
          onReady={() => setReady(true)}
          className="h-56 w-56 sm:h-72 sm:w-72"
        />
      </motion.div>
    </div>
  );
}
