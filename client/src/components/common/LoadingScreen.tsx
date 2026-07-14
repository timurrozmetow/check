import { motion } from "framer-motion";
import { Lottie, ANIM } from "./Lottie";

/** Полноэкранный лоадер: пользователь не видит пустой экран во время загрузки. */
export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <Lottie
        src={ANIM.loading}
        speed={0.9}
        className="h-56 w-56 sm:h-72 sm:w-72"
      />
    </motion.div>
  );
}
