import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  FileText,
  Images,
  Loader2,
  Table2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/api/hooks";
import { apiDownload, RequestError } from "@/api/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const ALL_PROJECTS = "all";

const REPORT_SECTIONS: { icon: typeof FileText; key: string }[] = [
  { icon: FileText, key: "cover" },
  { icon: FileText, key: "summary" },
  { icon: BarChart3, key: "charts" },
  { icon: Table2, key: "table" },
  { icon: Images, key: "details" },
];

export function AdminReports() {
  const { t } = useTranslation();
  const { data: projects } = useProjects();
  const now = new Date();
  const currentYear = now.getFullYear();

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [project, setProject] = useState<string>(ALL_PROJECTS);
  const [busy, setBusy] = useState(false);

  const years = [currentYear, currentYear - 1];

  async function download() {
    setBusy(true);
    try {
      const yearNum = Number(year);
      const monthNum = Number(month);
      let path = `/reports/monthly?year=${yearNum}&month=${monthNum}`;
      if (project !== ALL_PROJECTS) {
        path += `&projectId=${project}`;
      }
      const mm = String(monthNum).padStart(2, "0");
      const filename = `report-${yearNum}-${mm}.docx`;
      await apiDownload(path, filename);
      toast.success(t("adminReports.successToast"));
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("adminReports.errorToast"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">{t("adminReports.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("adminReports.subtitle")}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.7, 0.3, 1] }}
      >
        <Card className="rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {t("adminReports.cardTitle")}
            </CardTitle>
            <CardDescription>
              {t("adminReports.cardDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("adminReports.yearLabel")}</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("adminReports.monthLabel")}</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {t(`adminReports.months.${m}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("adminReports.projectLabel")}</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROJECTS}>{t("adminReports.allProjects")}</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-secondary/50 p-4">
              <p className="mb-3 text-sm font-semibold">{t("adminReports.sectionsTitle")}</p>
              <ul className="space-y-2.5">
                {REPORT_SECTIONS.map((section, i) => {
                  const Icon = section.icon;
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">
                        {t(`adminReports.sections.${section.key}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={download}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t("adminReports.downloadBtn")}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
