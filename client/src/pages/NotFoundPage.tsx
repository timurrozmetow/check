import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Lottie, ANIM } from "@/components/common/Lottie";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { roleHome } from "@/router/role-home";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const home = user ? roleHome(user.role) : "/login";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background px-4 text-center"
    >
      <Lottie
        src={ANIM.notFound}
        speed={0.9}
        className="h-72 w-72 sm:h-[26rem] sm:w-[26rem]"
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="max-w-sm text-muted-foreground">
          {t("notFound.description")}
        </p>
        <Button className="mt-2" onClick={() => navigate(home, { replace: true })}>
          {t("notFound.back")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
