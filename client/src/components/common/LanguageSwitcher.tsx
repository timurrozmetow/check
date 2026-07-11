import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGS, normalizeLang } from "@/i18n";

/** Переключатель языка интерфейса (RU / TR). */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = normalizeLang(i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("language.switch")}
          title={t("language.switch")}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-40 shadow-card">
        {SUPPORTED_LANGS.map((lng) => (
          <DropdownMenuItem key={lng} onSelect={() => i18n.changeLanguage(lng)}>
            <span className="flex-1">{t(`language.${lng}`)}</span>
            {current === lng && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
