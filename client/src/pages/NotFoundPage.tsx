import { useNavigate } from "react-router-dom";
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Lottie src={ANIM.notFound} className="h-64 w-64 sm:h-80 sm:w-80" />
      <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="max-w-sm text-muted-foreground">
        {t("notFound.description")}
      </p>
      <Button className="mt-2" onClick={() => navigate(home, { replace: true })}>
        {t("notFound.back")}
      </Button>
    </div>
  );
}
