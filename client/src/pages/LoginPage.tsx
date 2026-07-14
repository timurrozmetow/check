import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Lottie, ANIM } from "@/components/common/Lottie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/PasswordInput";
import { login, RequestError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { roleHome } from "@/router/role-home";

export function LoginPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"form" | "success">("form");
  const targetRef = useRef("/");
  const navigatedRef = useRef(false);

  // Уже авторизован (открыл /login с живой сессией) — сразу домой.
  // Во время анимации успеха (phase="success") редирект придержим.
  if (user && phase === "form") return <Navigate to={roleHome(user.role)} replace />;

  function goHome() {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigate(targetRef.current, { replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(email, password);
      targetRef.current = roleHome(u.role);
      setPhase("success");
      // Подстраховка, если событие "complete" не придёт.
      setTimeout(goHome, 1800);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : t("login.failed"));
      setAttempt((a) => a + 1);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Мягкий градиентный фон */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      <div className="absolute right-5 top-5 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.7, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo className="scale-125" />
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <h1 className="mb-1 text-xl font-bold">{t("login.title")}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{t("login.hint")}</p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@directorhub.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-center gap-3 overflow-hidden rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <Lottie
                  key={attempt}
                  src={ANIM.fail}
                  loop={false}
                  speed={0.9}
                  className="h-10 w-10 shrink-0"
                />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("login.submit")}
          </Button>
        </form>
      </motion.div>

      {/* Полноэкранный успех: плавно перекрывает форму после входа. */}
      <AnimatePresence>
        {phase === "success" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background"
          >
            <Lottie
              src={ANIM.success}
              loop={false}
              speed={0.9}
              className="h-60 w-60 sm:h-72 sm:w-72"
              onComplete={goHome}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="text-xl font-semibold"
            >
              {t("login.success")}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
