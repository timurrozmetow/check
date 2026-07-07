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

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const ALL_PROJECTS = "all";

const REPORT_SECTIONS: { icon: typeof FileText; text: string }[] = [
  { icon: FileText, text: "Титульная страница с названием и датой генерации" },
  {
    icon: FileText,
    text: "Сводка: всего задач, завершено, в работе, просрочено, среднее время",
  },
  {
    icon: BarChart3,
    text: "Три графика: по статусам, по проектам и завершено по неделям",
  },
  { icon: Table2, text: "Таблица задач с процентом готовности и временем" },
  {
    icon: Images,
    text: "Детализация завершённых задач с фото результатов",
  },
];

export function AdminReports() {
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
      toast.success("Отчёт сформирован и скачан");
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : "Не удалось скачать отчёт");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">Месячный отчёт</h1>
        <p className="text-sm text-muted-foreground">
          Сформируйте полный отчёт о проделанной работе в формате Word.
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
              Параметры отчёта
            </CardTitle>
            <CardDescription>
              Выберите период и, при необходимости, конкретный проект.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Год</Label>
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
                <Label>Месяц</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Проект</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROJECTS}>Все проекты</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-secondary/50 p-4">
              <p className="mb-3 text-sm font-semibold">Что войдёт в отчёт</p>
              <ul className="space-y-2.5">
                {REPORT_SECTIONS.map((section, i) => {
                  const Icon = section.icon;
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">
                        {section.text}
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
              Скачать отчёт (.docx)
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
