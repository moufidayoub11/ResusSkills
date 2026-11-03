"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  ScatterChart,
  BoxplotChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  GraphicComponent,
  MarkLineComponent,
} from "echarts/components";
import { SVGRenderer, CanvasRenderer } from "echarts/renderers";
import { Download, Table2, Info, RotateCcw } from "lucide-react";
import type { Figure, Query } from "@/lib/professor/types";
import { queryString } from "@/lib/professor/query";
import { auditFigureExport } from "@/actions/professor.actions";
import { Button, Choice, Dialog, Notice, Empty } from "./ui";
echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  BoxplotChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  GraphicComponent,
  MarkLineComponent,
  SVGRenderer,
  CanvasRenderer,
]);
const colors = [
  "#42b8aa",
  "#7c9fdf",
  "#dfb467",
  "#cc839c",
  "#9ea6dc",
  "#81b681",
  "#dc9777",
];
const number = (n: unknown) =>
  typeof n === "number"
    ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
    : String(n ?? "—");
function wrap(text: string, length: number) {
  return text
    .split("\n")
    .map(
      (line) =>
        line
          .match(new RegExp(`.{1,${length}}(?:\\s|$)|.{1,${length}}`, "g"))
          ?.map((s) => s.trim())
          .join("\n") ?? line,
    )
    .join("\n");
}
export function figureOptions(
  f: Figure,
  {
    dark = true,
    publication = false,
    width = 1000,
    filters = "",
    legend = {},
    zoom,
  }: {
    dark?: boolean;
    publication?: boolean;
    width?: number;
    filters?: string;
    legend?: Record<string, boolean>;
    zoom?: { start: number; end: number };
  } = {},
): echarts.EChartsCoreOption {
  const dense = f.labels.length > 12 && f.kind !== "scatter",
    horizontal = dense && ["bar", "stacked", "boxplot"].includes(f.kind),
    paired = f.kind === "paired";
  const foreground = dark ? "#e8edf1" : "#1d2b33",
    muted = dark ? "#9caab4" : "#52616b",
    border = dark ? "#2e3a43" : "#dce3e6";
  const font = publication ? 15 : 11;
  const top = publication ? 155 : 55;
  const bottom = publication ? 120 : 65;
  const legendRows = Math.ceil(
    f.series.length / Math.max(1, Math.floor(width / 220)),
  );
  const category = {
    type: "category",
    data: f.labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: border } },
    axisLabel: {
      color: muted,
      fontSize: font,
      interval: publication ? 0 : "auto",
      formatter: (v: string) =>
        wrap(v, horizontal ? 35 : publication ? 22 : 14),
      rotate: !horizontal && f.labels.length > 8 ? 30 : 0,
    },
  };
  const value = {
    type: "value",
    min: 0,
    max: f.percent ? 100 : undefined,
    axisLabel: { color: muted, fontSize: font },
    splitLine: { lineStyle: { color: border } },
    nameTextStyle: { color: muted, fontSize: font },
    nameGap: publication ? 45 : 32,
  };
  const series = f.series.map((s, index) => ({
    name: s.name,
    type:
      f.kind === "paired" || f.kind === "line"
        ? "line"
        : f.kind === "stacked"
          ? "bar"
          : f.kind,
    stack: f.kind === "stacked" ? "total" : undefined,
    data: s.values,
    connectNulls: false,
    symbolSize: paired ? 5 : f.kind === "scatter" ? 8 : 6,
    barMaxWidth: 48,
    itemStyle: {
      color: colors[index % colors.length],
      opacity: paired ? 0.6 : 0.95,
    },
    lineStyle: { width: paired ? 1 : 2, opacity: paired ? 0.3 : 1 },
    emphasis: { focus: "series" },
    ...(f.kind === "scatter" && f.percent && index === 0
      ? {
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { color: muted, type: "dashed" },
            label: { show: false },
            data: [[{ coord: [0, 0] }, { coord: [100, 100] }]],
          },
        }
      : {}),
  }));
  return {
    animation: false,
    backgroundColor: dark ? "#151d24" : "#ffffff",
    color: colors,
    textStyle: { fontFamily: "Inter, Arial, sans-serif", color: foreground },
    title: publication
      ? {
          text: wrap(f.title, Math.floor(width / 12)),
          subtext: wrap(
            `${f.n} observations · ${f.participants} participants\n${filters}`,
            Math.floor(width / 8),
          ),
          left: 28,
          top: 22,
          textStyle: { fontSize: 24, fontWeight: 600, color: foreground },
          subtextStyle: { fontSize: 13, lineHeight: 20, color: muted },
        }
      : undefined,
    tooltip: { trigger: f.kind === "scatter" ? "item" : "axis", confine: true },
    legend: {
      show: !paired,
      top: publication ? 112 : 8,
      left: horizontal ? "center" : "left",
      type: publication ? "plain" : "scroll",
      selected: legend,
      textStyle: { color: muted, fontSize: font },
      itemWidth: 12,
      itemHeight: 8,
      padding: [4, 16],
      formatter: (name: string) => (publication ? wrap(name, 26) : name),
    },
    grid: {
      left: horizontal ? (publication ? 310 : 170) : publication ? 85 : 50,
      right: publication ? 40 : 24,
      top:
        top + (publication && !paired ? Math.max(0, legendRows - 1) * 35 : 0),
      bottom,
      containLabel: !horizontal,
    },
    xAxis:
      f.kind === "scatter"
        ? {
            ...value,
            name: f.labels[0],
            nameLocation: "middle",
            max: f.percent ? 100 : undefined,
          }
        : horizontal
          ? { ...value, name: f.unit, nameLocation: "middle" }
          : category,
    yAxis:
      f.kind === "scatter"
        ? {
            ...value,
            name: f.labels[1],
            nameLocation: "middle",
            max:
              f.id === "temps-exactitude" ? 100 : f.percent ? 100 : undefined,
          }
        : horizontal
          ? category
          : { ...value, name: f.unit, nameGap: 18 },
    series,
    dataZoom:
      !publication && dense
        ? [
            {
              type: "slider",
              ...(horizontal
                ? { yAxisIndex: 0, right: 0, width: 12 }
                : { xAxisIndex: 0, bottom: 6, height: 14 }),
              start: zoom?.start ?? 0,
              end: zoom?.end ?? Math.min(100, 1200 / f.labels.length),
              showDetail: false,
              borderColor: "transparent",
              textStyle: { color: muted },
            },
          ]
        : undefined,
    graphic: publication
      ? [
          {
            type: "text",
            left: 28,
            bottom: 20,
            style: {
              text: wrap(f.methodology, Math.floor(width / 7.2)),
              font: "12px Inter, Arial, sans-serif",
              fill: muted,
              lineHeight: 18,
              width: width - 56,
            },
          },
        ]
      : undefined,
  };
}
export function ChartPanel({
  figure: f,
  query: q,
}: {
  figure: Figure;
  query: Query;
}) {
  const root = useRef<HTMLDivElement>(null),
    instance = useRef<echarts.EChartsType | null>(null),
    router = useRouter();
  const [table, setTable] = useState(false),
    [method, setMethod] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [format, setFormat] = useState("svg"),
    [theme, setTheme] = useState("light"),
    [scope, setScope] = useState("full"),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
  const savedExport = useRef<{ url: string; blob: Blob } | null>(null);
  const filters = `Début de tentative : ${q.from || "première date"} — ${q.to || "dernière date"} · Africa/Casablanca · ${q.selection === "first" ? "première terminée par étudiant" : q.selection === "latest" ? "dernière terminée par étudiant" : "toutes les tentatives"}${q.phase ? " · phase " + q.phase : ""}${q.question ? " · question " + q.question : ""}${q.students.length ? " · " + q.students.length + " étudiants sélectionnés" : ""}${q.status ? " · statut " + q.status : ""}${q.availability ? " · disponibilité " + q.availability : ""}${q.minScore !== undefined ? " · minimum " + q.minScore + " %" : ""}${q.maxScore !== undefined ? " · maximum " + q.maxScore + " %" : ""}`;
  useEffect(() => {
    if (!root.current) return;
    const chart = echarts.init(root.current, undefined, { renderer: "svg" });
    instance.current = chart;
    const workspace = root.current.closest(".professor-workspace");
    const draw = () =>
      chart.setOption(
        figureOptions(f, {
          dark: workspace?.getAttribute("data-theme") !== "light",
          width: root.current?.clientWidth,
        }),
        true,
      );
    draw();
    const resize = new ResizeObserver(() => {
      chart.resize();
    });
    resize.observe(root.current);
    const mutation = new MutationObserver(draw);
    if (workspace)
      mutation.observe(workspace, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    chart.on("click", (params: any) => {
      if (!f.drilldown) return;
      const changes: Partial<Query> = { ...q, page: 1, selection: "all" };
      if (f.id === "distribution") {
        const width = 100 / q.bins;
        changes.minScore = params.dataIndex * width;
        changes.maxScore =
          params.dataIndex === q.bins - 1
            ? 100
            : (params.dataIndex + 1) * width - Number.EPSILON * 100;
      } else if (f.id === "phases")
        changes.phase = f.categories?.[params.dataIndex] ?? "";
      else if (f.id === "questions")
        changes.question = f.categories?.[params.dataIndex] ?? "";
      router.push(`${f.drilldown}?${queryString(changes)}`);
    });
    return () => {
      resize.disconnect();
      mutation.disconnect();
      chart.dispose();
      instance.current = null;
    };
  }, [f, q, router]);
  useEffect(
    () => () => {
      if (savedExport.current) URL.revokeObjectURL(savedExport.current.url);
    },
    [],
  );
  const generate = () =>
    start(async () => {
      setError("");
      try {
        const old = instance.current?.getOption() as any;
        const legend =
          scope === "selection" ? (old?.legend?.[0]?.selected ?? {}) : {};
        let output = f;
        if (
          scope === "selection" &&
          old?.dataZoom?.[0] &&
          f.kind !== "scatter"
        ) {
          const z = old.dataZoom[0],
            first = Math.floor(((z.start ?? 0) / 100) * f.labels.length),
            last = Math.ceil(((z.end ?? 100) / 100) * f.labels.length);
          output = {
            ...f,
            labels: f.labels.slice(first, last),
            series: f.series.map((s) => ({
              ...s,
              values: s.values.slice(first, last),
            })),
          };
        }
        const width = 1200,
          horizontal =
            output.labels.length > 12 &&
            ["bar", "stacked", "boxplot"].includes(output.kind);
        const height = Math.max(
          800,
          horizontal ? output.labels.length * 42 + 380 : 800,
          Math.ceil(output.series.length / 5) * 36 + 600,
        );
        const host = document.createElement("div");
        host.style.cssText = `position:fixed;left:-100000px;width:${width}px;height:${height}px`;
        document.body.appendChild(host);
        let chart: echarts.EChartsType | undefined;
        try {
          chart = echarts.init(host, undefined, {
            renderer: format === "svg" ? "svg" : "canvas",
            width,
            height,
            devicePixelRatio: 2,
          });
          chart.setOption(
            figureOptions(output, {
              publication: true,
              dark: theme === "dark",
              width,
              filters:
                filters +
                (scope === "selection" ? " · VUE PARTIELLE (zoom/séries)" : ""),
              legend,
            }),
          );
          const data = chart.getDataURL({
            type: format as "svg" | "png",
            pixelRatio: 2,
            backgroundColor: theme === "light" ? "#fff" : "#151d24",
          });
          const blob = await (await fetch(data)).blob();
          if (savedExport.current) URL.revokeObjectURL(savedExport.current.url);
          const url = URL.createObjectURL(blob);
          savedExport.current = { url, blob };
          setPreview(url);
        } finally {
          chart?.dispose();
          host.remove();
        }
      } catch {
        setError(
          "Impossible de générer la figure. Réessayez avec moins de séries.",
        );
      }
    });
  const download = () =>
    start(async () => {
      if (!savedExport.current) return;
      const result = await auditFigureExport({
        figure: f.id,
        format,
        theme,
        scope,
        filters: queryString(q),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const a = document.createElement("a");
      a.href = savedExport.current.url;
      a.download = `resusskills-${f.id}-${q.from || "debut"}-${q.to || "fin"}-${new Date().toISOString().replace(/[:.]/g, "-")}.${format}`;
      a.click();
    });
  const invalidate = () => {
    setPreview("");
  };
  const hasData = f.series.some(
    (s) => s.values.length > 0 && s.values.some((v) => v !== null),
  );
  return (
    <section className={`p-panel ${f.labels.length > 12 ? "p-span-2" : ""}`}>
      <header className="p-panel-head">
        <div>
          <h2>{f.title}</h2>
          <p>{f.subtitle || f.unit}</p>
        </div>
        <div className="p-chart-actions">
          <Button
            variant="ghost"
            aria-label={`Tableau : ${f.title}`}
            onClick={() => setTable(!table)}
          >
            <Table2 size={16} />
          </Button>
          <Button
            variant="ghost"
            aria-label={`Méthode : ${f.title}`}
            onClick={() => setMethod(!method)}
          >
            <Info size={16} />
          </Button>
          <Button
            variant="ghost"
            aria-label={`Exporter : ${f.title}`}
            onClick={() => {
              setExportOpen(true);
              setPreview("");
            }}
            disabled={!hasData}
          >
            <Download size={16} />
          </Button>
        </div>
      </header>
      <div className="p-chart-summary">
        <span>{number(f.n)} observations</span>
        <span>{number(f.participants)} participants</span>
      </div>
      {method && (
        <div className="p-panel-body">
          <Notice>{f.methodology}</Notice>
        </div>
      )}
      {!hasData ? (
        <Empty
          title="Données insuffisantes"
          description="Aucune observation éligible pour cette figure dans la sélection."
        />
      ) : (
        <>
          <div
            ref={root}
            className={`p-figure ${f.labels.length > 12 ? "p-figure-tall" : ""}`}
            role="img"
            aria-label={`${f.title}. ${f.n} observations. Tableau de données disponible ci-dessous.`}
          />
          {table && (
            <div
              className="p-table-scroll"
              tabIndex={0}
              role="region"
              aria-label={`Données : ${f.title}`}
            >
              <table>
                <caption className="sr-only">{f.title}</caption>
                <thead>
                  <tr>
                    {f.columns.map((c) => (
                      <th scope="col" key={c}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {f.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{number(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <footer className="p-panel-footer">
        <span>
          {f.drilldown
            ? "Sélectionnez un élément pour explorer les enregistrements."
            : "Analyse descriptive · données observées"}
        </span>
        <Button
          variant="ghost"
          aria-label="Réinitialiser la vue du graphique"
          onClick={() =>
            instance.current?.setOption(
              figureOptions(f, {
                dark:
                  root.current
                    ?.closest(".professor-workspace")
                    ?.getAttribute("data-theme") !== "light",
              }),
              true,
            )
          }
        >
          <RotateCcw size={13} />
        </Button>
      </footer>
      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exporter la figure"
        wide
      >
        <div className="p-form-grid">
          <Choice
            label="Format"
            value={format}
            onChange={(v) => {
              setFormat(v);
              invalidate();
            }}
            options={[
              { value: "svg", label: "SVG · vectoriel" },
              { value: "png", label: "PNG · largeur 2 400 px" },
            ]}
          />
          <Choice
            label="Présentation"
            value={theme}
            onChange={(v) => {
              setTheme(v);
              invalidate();
            }}
            options={[
              { value: "light", label: "Publication · fond clair" },
              { value: "dark", label: "Tableau de bord · fond sombre" },
            ]}
          />
          <Choice
            label="Étendue"
            value={scope}
            onChange={(v) => {
              setScope(v);
              invalidate();
            }}
            options={[
              { value: "full", label: "Toutes les données filtrées" },
              {
                value: "selection",
                label: "Zoom et séries visibles uniquement",
              },
            ]}
          />
        </div>
        <p className="p-form-note">
          Rendu natif ECharts. La figure inclut les unités, effectifs, filtres
          et limites méthodologiques. Aucune donnée nominative.
        </p>
        {error && <Notice error>{error}</Notice>}
        {preview && (
          <div className="p-export-preview">
            <img src={preview} alt="Prévisualisation de la figure exportée" />
          </div>
        )}
        <div className="p-form-footer">
          <Button variant="outline" onClick={generate} pending={pending}>
            Générer l’aperçu
          </Button>
          <Button onClick={download} pending={pending} disabled={!preview}>
            Télécharger {format.toUpperCase()}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
