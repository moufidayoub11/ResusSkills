import bank from "@/data/question-bank.json";
import type { Figure, Metric, Row, Study } from "./types";
import { parseTreatment } from "./service";

export const phaseNames: Record<string, string> = {
  preTest: "Pré-test",
  "phase-1": "Hémorragique",
  "phase-2": "Septique",
  "phase-3": "Anaphylactique",
  "phase-4": "Cardiogénique",
  postTest: "Post-test",
};
const phases = Object.keys(phaseNames);
export const numeric = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
const validPercent = (x: unknown): x is number => numeric(x) && x >= 0 && x <= 100;
function participantCount(study: Study, attemptIds: string[]) {
  const selected = new Set(attemptIds);
  return new Set(study.allAttempts.filter(a => selected.has(a.id)).map(a => a.userId)).size;
}
const format = (n: number | null, decimals = 1) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: decimals,
      }).format(n);
export function quantile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const i = Math.floor(pos);
  return (
    sorted[i] +
    (sorted[Math.min(i + 1, sorted.length - 1)] - sorted[i]) * (pos - i)
  );
}
export function descriptive(values: number[]) {
  const n = values.length;
  const mean = n ? values.reduce((a, b) => a + b, 0) / n : null;
  return {
    n,
    mean,
    median: quantile(values, 0.5),
    q1: quantile(values, 0.25),
    q3: quantile(values, 0.75),
    min: n ? Math.min(...values) : null,
    max: n ? Math.max(...values) : null,
    sd:
      n > 1
        ? Math.sqrt(values.reduce((a, b) => a + (b - mean!) ** 2, 0) / (n - 1))
        : null,
  };
}
export function histogram(values: number[], bins = 5, min = 0, max = 100) {
  const width = (max - min) / bins;
  const labels = Array.from(
    { length: bins },
    (_, i) => `${format(min + i * width)}–${format(min + (i + 1) * width)}`,
  );
  const counts = labels.map(() => 0);
  for (const value of values)
    if (value >= min && value <= max)
      counts[Math.min(bins - 1, Math.floor((value - min) / width))]++;
  return { labels, counts };
}
const group = (rows: Row[], key: (r: Row) => string) => {
  const g = new Map<string, Row[]>();
  for (const r of rows) {
    const k = key(r);
    g.set(k, [...(g.get(k) ?? []), r]);
  }
  return g;
};
function base(
  study: Study,
  id: string,
  title: string,
  methodology: string,
): Figure {
  return {
    id,
    title,
    subtitle: "",
    kind: "bar",
    labels: [],
    series: [],
    columns: [],
    rows: [],
    unit: "",
    methodology,
    n: study.attempts.length,
    participants: new Set(study.attempts.map((a) => a.userId)).size,
  };
}
const selectedAnswers = (s: Study) => {
  const ids = new Set(s.attempts.map((a) => a.id));
  return s.answers.filter((a) => ids.has(a.attemptId));
};
const accuracy = (rows: Row[]) =>
  rows.length
    ? (100 * rows.filter((a) => a.isCorrect && !a.isSkipped).length) /
      rows.length
    : null;
const summary = (values: number[], s: Study) =>
  s.query.summary === "median"
    ? quantile(values, 0.5)
    : descriptive(values).mean;
export function scoreFigures(study: Study): Figure[] {
  const values = study.attempts
    .map((a) => a.scores?.percentage)
    .filter(numeric)
    .filter((n) => n >= 0 && n <= 100);
  const h = histogram(values, study.query.bins);
  const method =
    "Pourcentages enregistrés des tentatives terminées. Dernière classe inclusive à 100 %. Les résultats historiques ne sont pas recalculés.";
  const distribution = base(
    study,
    "distribution",
    "Distribution des scores",
    method,
  );
  distribution.labels = h.labels;
  distribution.unit =
    study.query.display === "percentage" ? "% des tentatives" : "Tentatives";
  distribution.percent = study.query.display === "percentage";
  distribution.series = [
    {
      name: distribution.unit,
      values: h.counts.map((c) =>
        study.query.display === "percentage"
          ? values.length
            ? (100 * c) / values.length
            : 0
          : c,
      ),
    },
  ];
  distribution.columns = ["Intervalle (%)", "Tentatives", "Part (%)"];
  distribution.rows = h.labels.map((label, i) => [
    label,
    h.counts[i],
    values.length ? (100 * h.counts[i]) / values.length : null,
  ]);
  distribution.n = values.length;
  distribution.participants = participantCount(study, study.attempts.filter(a => validPercent(a.scores?.percentage)).map(a => a.id));
  distribution.drilldown = "/dashboard/attempts";
  const d = descriptive(values);
  const box = base(
    study,
    "dispersion",
    "Dispersion des résultats",
    "Quartiles interpolés (type 7). Moustaches : minimum et maximum observés ; ce ne sont pas des intervalles de confiance.",
  );
  box.kind = "boxplot";
  box.n = distribution.n;
  box.participants = distribution.participants;
  box.percent = true;
  box.unit = "Score enregistré (%)";
  box.labels = ["Scores"];
  box.series = [
    {
      name: "Scores",
      values: values.length ? [[d.min!, d.q1!, d.median!, d.q3!, d.max!]] : [],
    },
  ];
  box.columns = ["Mesure", "Valeur (%)"];
  box.rows = [
    ["Minimum", d.min],
    ["Q1", d.q1],
    ["Médiane", d.median],
    ["Q3", d.q3],
    ["Maximum", d.max],
  ];
  return [distribution, box];
}
export function phaseFigure(study: Study): Figure {
  const answers = selectedAnswers(study);
  const f = base(
    study,
    "phases",
    "Performance par phase",
    "Exactitude sur les réponses enregistrées, y compris les réponses passées. Dénominateur observé, pas le nombre de questions de la banque actuelle. Une phase sans réponse est manquante.",
  );
  f.kind = "line";
  f.labels = phases.map((p) => phaseNames[p]);
  f.percent = true;
  f.unit = "Réponses correctes (%)";
  f.columns = ["Phase", "Correctes", "Réponses enregistrées", "Exactitude (%)"];
  f.rows = phases.map((p) => {
    const rows = answers.filter((a) => a.phase === p);
    return [
      phaseNames[p],
      rows.filter((a) => a.isCorrect && !a.isSkipped).length,
      rows.length,
      accuracy(rows),
    ];
  });
  f.series = [
    {
      name: "Exactitude observée",
      values: f.rows.map((r) => r[3] as number | null),
    },
  ];
  f.drilldown = "/dashboard/answers";
  f.categories = phases;
  return f;
}
export function overviewMetrics(study: Study): Metric[] {
  const completed = study.allAttempts.filter((a) => a.status === "completed");
  const avg = descriptive(
    completed.map((a) => a.scores?.percentage).filter(numeric),
  ).mean;
  return [
    {
      label: "Étudiants inscrits",
      value: format(study.registeredStudents, 0),
      detail: "Tous les comptes étudiants",
    },
    {
      label: "Tentatives",
      value: format(study.allAttempts.length, 0),
      detail: `${new Set(study.allAttempts.map((a) => a.userId)).size} participants dans la sélection`,
    },
    {
      label: "Taux de complétion",
      value: study.allAttempts.length
        ? `${format((100 * completed.length) / study.allAttempts.length)} %`
        : "—",
      detail: `${completed.length} terminées / ${study.allAttempts.length} tentatives`,
    },
    {
      label: "Score moyen",
      value: avg === null ? "—" : `${format(avg)} %`,
      detail: "Score enregistré · tentatives terminées",
    },
  ];
}
export function scoreMetrics(study: Study): Metric[] {
  const d = descriptive(
    study.attempts.map((a) => a.scores?.percentage).filter(numeric),
  );
  return [
    {
      label: "Tentatives analysées",
      value: format(d.n, 0),
      detail: `${new Set(study.attempts.map((a) => a.userId)).size} participants`,
    },
    {
      label: "Moyenne",
      value: format(d.mean),
      detail: "Pourcentage enregistré",
    },
    {
      label: "Médiane",
      value: format(d.median),
      detail: `Q1 ${format(d.q1)} · Q3 ${format(d.q3)}`,
    },
    { label: "Écart-type", value: format(d.sd), detail: "Échantillon · n − 1" },
  ];
}
export function prePostFigures(study: Study): Figure[] {
  const byAttempt = group(selectedAnswers(study), (a) => a.attemptId);
  const pairs: {
    id: string;
    pre: number;
    post: number;
    nPre: number;
    nPost: number;
    signature: string;
  }[] = [];
  for (const [id, rows] of byAttempt) {
    const pre = rows.filter((r) => r.phase === "preTest"),
      post = rows.filter((r) => r.phase === "postTest");
    if (!pre.length || !post.length) continue;
    const signature = JSON.stringify(
      rows
        .filter((r) => ["preTest", "postTest"].includes(r.phase))
        .map((r) => [r.phase, r.questionId, r.correctOptionId ?? "?"])
        .sort(),
    );
    pairs.push({
      id,
      pre: accuracy(pre)!,
      post: accuracy(post)!,
      nPre: pre.length,
      nPost: post.length,
      signature,
    });
  }
  const signatures = [...new Set(pairs.map((p) => p.signature))];
  const method =
    "Comparaison au sein de la même tentative, sur les réponses enregistrées. Des ensembles de questions différents sont distingués. Aucun effet causal ou gain pédagogique démontré. Les tentatives sans pré-test ou post-test sont exclues.";
  const scatter = base(study, "pre-post", "Pré-test et post-test", method);
  scatter.kind = "scatter";
  scatter.unit = "Exactitude observée (%)";
  scatter.percent = true;
  scatter.labels = ["Pré-test (%)", "Post-test (%)"];
  scatter.n = pairs.length;
  scatter.series = signatures.map((signature, i) => ({
    name: `Structure ${i + 1}`,
    values: pairs
      .filter((p) => p.signature === signature)
      .map((p) => [p.pre, p.post]),
  }));
  scatter.columns = [
    "Tentative",
    "Pré-test (%)",
    "Post-test (%)",
    "Variation (points)",
    "Réponses pré",
    "Réponses post",
    "Structure",
  ];
  scatter.rows = pairs.map((p, i) => [
    `T${i + 1}`,
    p.pre,
    p.post,
    p.post - p.pre,
    p.nPre,
    p.nPost,
    `Structure ${signatures.indexOf(p.signature) + 1}`,
  ]);
  const change = base(study, "variations", "Variations pré / post", method);
  change.unit = "Tentatives";
  const hist = histogram([], 10, -100, 100);
  change.labels = hist.labels;
  change.series = signatures.map((sig, i) => ({
    name: `Structure ${i + 1}`,
    values: histogram(
      pairs.filter((p) => p.signature === sig).map((p) => p.post - p.pre),
      10,
      -100,
      100,
    ).counts,
  }));
  change.columns = ["Variation (points)", ...change.series.map((s) => s.name)];
  change.rows = hist.labels.map((l, i) => [
    l,
    ...change.series.map((s) => s.values[i] as number),
  ]);
  change.n = pairs.length;
  const paired = base(study, "apparies", "Résultats appariés", method);
  paired.kind = "paired";
  paired.unit = "Exactitude observée (%)";
  paired.percent = true;
  paired.labels = ["Pré-test", "Post-test"];
  paired.series = pairs.map((p, i) => ({
    name: `T${i + 1} · structure ${signatures.indexOf(p.signature) + 1}`,
    values: [p.pre, p.post],
  }));
  paired.columns = scatter.columns;
  paired.rows = scatter.rows;
  paired.n = pairs.length;
  for (const figure of [scatter, change, paired]) {
    figure.participants = participantCount(study, pairs.map(p => p.id));
    figure.subtitle = `${pairs.length} paires éligibles / ${study.attempts.length} tentatives sélectionnées`;
  }
  return [scatter, change, paired];
}
export function questionFigures(study: Study): Figure[] {
  const answers = selectedAnswers(study);
  const grouped = group(
    answers,
    (a) =>
      `${a.questionId} · ${a.correctOptionId ?? (a.correctTreatmentIds?.length ? [...a.correctTreatmentIds].sort().join("+") : "clé inconnue")}`,
  );
  const entries = [...grouped].sort(
    (a, b) => (accuracy(a[1]) ?? 0) - (accuracy(b[1]) ?? 0),
  );
  const f = base(
    study,
    "questions",
    "Exactitude par question",
    "Les questions sont séparées par identifiant et clé de correction enregistrée. Un identifiant ne prouve pas une version de contenu. Les absences de réponse ne sont pas imputées.",
  );
  f.kind = "stacked";
  f.percent = true;
  f.unit = "Part des réponses (%)";
  f.labels = entries.map(([k]) => k);
  f.categories = entries.map(([, rows]) => rows[0].questionId);
  f.drilldown = "/dashboard/answers";
  f.series = ["Correctes", "Incorrectes", "Passées"].map((name, index) => ({
    name,
    values: entries.map(
      ([, rows]) =>
        (100 *
          rows.filter((r) =>
            index === 2
              ? r.isSkipped
              : index === 0
                ? r.isCorrect && !r.isSkipped
                : !r.isCorrect && !r.isSkipped,
          ).length) /
        rows.length,
    ),
  }));
  f.columns = [
    "Question / clé",
    "Correctes",
    "Incorrectes",
    "Passées",
    "Réponses",
  ];
  f.rows = entries.map(([k, rows]) => [
    k,
    rows.filter((r) => r.isCorrect && !r.isSkipped).length,
    rows.filter((r) => !r.isCorrect && !r.isSkipped).length,
    rows.filter((r) => r.isSkipped).length,
    rows.length,
  ]);
  f.n = answers.length;
  const options = base(
    study,
    "options",
    "Choix de réponse aux QCM",
    "Fréquences des options enregistrées. Les réponses passées sont affichées séparément. Filtrez une question pour une lecture détaillée.",
  );
  const opts = group(
    answers.filter((a) => a.questionType === "mcq"),
    (a) =>
      `${a.questionId} · ${a.isSkipped ? "passée" : (a.selectedOptionId ?? "manquante")}`,
  );
  options.labels = [...opts.keys()].sort();
  options.unit = "Sélections";
  options.series = [
    {
      name: "Réponses",
      values: options.labels.map((k) => opts.get(k)!.length),
    },
  ];
  options.columns = ["Question / option", "Réponses"];
  options.rows = options.labels.map((k, i) => [
    k,
    options.series[0].values[i] as number,
  ]);
  const treatments = base(
    study,
    "traitements",
    "Sélections de traitements",
    "Nombre de réponses contenant chaque traitement. Une réponse peut contenir plusieurs traitements : les pourcentages ne s’additionnent pas à 100 %.",
  );
  const selections = new Map<string, number>();
  for (const a of answers.filter(
    (a) => a.questionType === "clinical-case" && !a.isSkipped,
  ))
    for (const t of new Set(parseTreatment(a.selectedOptionId)))
      selections.set(
        `${a.questionId} · ${t}`,
        (selections.get(`${a.questionId} · ${t}`) ?? 0) + 1,
      );
  treatments.labels = [...selections.keys()].sort();
  treatments.unit = "Sélections";
  treatments.series = [
    {
      name: "Sélectionné",
      values: treatments.labels.map((k) => selections.get(k)!),
    },
  ];
  treatments.columns = ["Question / traitement", "Sélections"];
  treatments.rows = treatments.labels.map((k) => [k, selections.get(k)!]);
  return [f, options, treatments];
}
export function progressionFigures(study: Study): Figure[] {
  const complete = study.allAttempts.filter((a) => a.status === "completed");
  const groups = group(complete, (a) => a.userId);
  const repeat = [...groups.values()].filter((g) => g.length > 1);
  const paired = base(
    study,
    "premiere-derniere",
    "Première et dernière tentative",
    "Première et dernière tentative terminée par participant dans la période, indépendamment du sélecteur de tentative. Comparaison descriptive ; versions de tests non établies.",
  );
  paired.kind = "scatter";
  paired.percent = true;
  paired.unit = "Score enregistré (%)";
  paired.labels = ["Première (%)", "Dernière (%)"];
  paired.series = [
    {
      name: "Participants",
      values: repeat.map((g) => [
        g[0].scores.percentage,
        g[g.length - 1].scores.percentage,
      ]),
    },
  ];
  paired.n = repeat.length;
  paired.participants = repeat.length;
  paired.columns = [
    "Participant",
    "Première (%)",
    "Dernière (%)",
    "Tentatives",
  ];
  paired.rows = repeat.map((g, i) => [
    `P${i + 1}`,
    g[0].scores.percentage,
    g[g.length - 1].scores.percentage,
    g.length,
  ]);
  const trend = base(
    study,
    "ordre",
    "Scores selon l’ordre des tentatives",
    "Résumé par rang de tentative terminée. L’effectif varie à chaque rang ; ce n’est pas une cohorte fixe.",
  );
  trend.kind = "line";
  trend.percent = true;
  trend.unit = "Score enregistré (%)";
  const max = Math.max(0, ...[...groups.values()].map((g) => g.length));
  trend.labels = Array.from({ length: max }, (_, i) => String(i + 1));
  trend.series = [
    {
      name: study.query.summary === "median" ? "Médiane" : "Moyenne",
      values: trend.labels.map((_, i) =>
        summary(
          [...groups.values()]
            .map((g) => g[i]?.scores?.percentage)
            .filter(numeric),
          study,
        ),
      ),
    },
  ];
  trend.columns = ["Rang", "Score (%)", "Participants"];
  trend.rows = trend.labels.map((rank, i) => [
    rank,
    trend.series[0].values[i] as number | null,
    [...groups.values()].filter((g) => g[i]).length,
  ]);
  const participation = base(
    study,
    "participation",
    "Participation aux phases",
    "Nombre de tentatives avec au moins une réponse enregistrée dans chaque phase. Les absences ne prouvent pas un abandon.",
  );
  participation.labels = phases.map((p) => phaseNames[p]);
  participation.unit = "Tentatives";
  participation.series = [
    {
      name: "Au moins une réponse",
      values: phases.map(
        (p) =>
          new Set(
            study.answers.filter((a) => a.phase === p).map((a) => a.attemptId),
          ).size,
      ),
    },
  ];
  participation.columns = ["Phase", "Tentatives"];
  participation.rows = participation.labels.map((l, i) => [
    l,
    participation.series[0].values[i] as number,
  ]);
  const activity = base(
    study,
    "activite",
    "Tentatives dans le temps",
    "Tentatives commencées par période, heure Africa/Casablanca. Aucun suivi supplémentaire n’est utilisé.",
  );
  const periods = group(
    study.allAttempts.filter((a) => Number.isFinite(Date.parse(a.startedAt))),
    (a) => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Casablanca",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(a.startedAt));
      if (study.query.grouping === "month") return parts.slice(0, 7);
      if (study.query.grouping === "week") {
        const date = new Date(parts + "T12:00:00Z");
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        return date.toISOString().slice(0, 10);
      }
      return parts;
    },
  );
  activity.labels = [...periods.keys()].sort();
  activity.unit = "Tentatives";
  activity.series = [
    {
      name: "Commencées",
      values: activity.labels.map((k) => periods.get(k)!.length),
    },
  ];
  activity.columns = ["Période", "Tentatives"];
  activity.rows = activity.labels.map((k) => [k, periods.get(k)!.length]);
  const incomplete = base(
    study,
    "incompletes",
    "Tentatives non terminées",
    "Statut et phase enregistrés des tentatives non terminées. Ne présume pas que le participant a abandonné.",
  );
  const pending = group(
    study.allAttempts.filter((a) => a.status !== "completed"),
    (a) =>
      `${a.status === "abandoned" ? "Abandonnée" : "En cours"} · ${phaseNames[a.currentPhase] ?? a.currentPhase}`,
  );
  incomplete.labels = [...pending.keys()];
  incomplete.unit = "Tentatives";
  incomplete.series = [
    {
      name: "Non terminées",
      values: incomplete.labels.map((k) => pending.get(k)!.length),
    },
  ];
  incomplete.columns = ["État / phase", "Tentatives"];
  incomplete.rows = incomplete.labels.map((k) => [k, pending.get(k)!.length]);
  return [paired, trend, participation, activity, incomplete];
}
export function timingFigures(study: Study): Figure[] {
  const answers = selectedAnswers(study),
    timed = answers.filter((a) => numeric(a.timeSpent) && a.timeSpent > 0);
  const groups = group(timed, (a) => a.questionId);
  const f = base(
    study,
    "temps-question",
    "Temps de réponse par question",
    "Uniquement les durées strictement positives enregistrées. Zéro et absence sont exclus. Mesures client, non assimilables à un temps d’étude contrôlé. Moustaches : minimum et maximum.",
  );
  f.kind = "boxplot";
  f.unit = "Secondes";
  f.labels = [...groups.keys()].sort();
  f.series = [
    {
      name: "Temps de réponse",
      values: f.labels.map((k) => {
        const d = descriptive(groups.get(k)!.map((a) => a.timeSpent));
        return [d.min!, d.q1!, d.median!, d.q3!, d.max!];
      }),
    },
  ];
  f.columns = [
    "Question",
    "Min (s)",
    "Q1 (s)",
    "Médiane (s)",
    "Q3 (s)",
    "Max (s)",
    "Réponses chronométrées",
  ];
  f.rows = f.labels.map((k, i) => [
    k,
    ...(f.series[0].values[i] as number[]),
    groups.get(k)!.length,
  ]);
  f.n = timed.length;
  f.subtitle = `${timed.length} / ${answers.length} réponses avec durée utilisable`;
  const scatter = base(
    study,
    "temps-exactitude",
    "Temps et exactitude par question",
    "Chaque point résume les réponses chronométrées d’une question. Association descriptive, sans interprétation causale.",
  );
  scatter.kind = "scatter";
  scatter.unit = "Secondes / %";
  scatter.labels = ["Temps médian (s)", "Exactitude (%)"];
  scatter.series = [
    {
      name: "Questions",
      values: f.labels.map((k) => [
        quantile(
          groups.get(k)!.map((a) => a.timeSpent),
          0.5,
        )!,
        accuracy(groups.get(k)!)!,
      ]),
    },
  ];
  scatter.columns = [
    "Question",
    "Temps médian (s)",
    "Exactitude (%)",
    "Réponses",
  ];
  scatter.rows = f.labels.map((k) => [
    k,
    quantile(
      groups.get(k)!.map((a) => a.timeSpent),
      0.5,
    ),
    accuracy(groups.get(k)!),
    groups.get(k)!.length,
  ]);
  const elapsed = base(
    study,
    "intervalle",
    "Intervalle entre début et fin",
    "Différence des horodatages valides : inclut pauses et reprises. Ce n’est PAS du temps actif. timeSpentSeconds historique n’est pas utilisé.",
  );
  const durations = study.attempts
    .map((a) => (Date.parse(a.completedAt) - Date.parse(a.startedAt)) / 3600000)
    .filter((x) => numeric(x) && x >= 0);
  const h = histogram(durations, 10, 0, Math.max(1, ...durations));
  elapsed.labels = h.labels;
  elapsed.unit = "Tentatives";
  elapsed.series = [{ name: "Tentatives", values: h.counts }];
  elapsed.columns = ["Intervalle (heures)", "Tentatives"];
  elapsed.rows = h.labels.map((l, i) => [l, h.counts[i]]);
  elapsed.n = durations.length;
  f.participants = participantCount(study, timed.map(a => a.attemptId));
  scatter.n = groups.size;
  scatter.participants = f.participants;
  return [f, scatter, elapsed];
}
export function qualityRows(study: Study) {
  const known = new Set([
    ...bank.preTest.map((q) => q.id),
    ...bank.postTest.map((q) => q.id),
    ...bank.phases.flatMap((p) => p.cases.map((c) => c.id)),
  ]);
  const byAttempt = group(study.answers, (a) => a.attemptId);
  const rows: {
    id: string;
    type: string;
    detail: string;
    count: number;
    href: string;
  }[] = [
    {
      id: "timing",
      type: "Durées manquantes",
      detail: "Zéro ou absence : aucune durée positive mesurée.",
      count: study.answers.filter((a) => !(a.timeSpent > 0)).length,
      href: "/dashboard/answers?availability=untimed",
    },
    {
      id: "reference",
      type: "Questions non résolues",
      detail:
        "Identifiant absent de la banque actuelle ; vérifier la source historique.",
      count: study.answers.filter((a) => !known.has(a.questionId)).length,
      href: "/dashboard/answers?availability=unresolved",
    },
    {
      id: "missing",
      type: "Réponses absentes (base confirmée)",
      detail:
        "Écart au nombre attendu uniquement pour les tentatives dont le dénominateur est confirmé. Les autres restent indéterminées.",
      count: study.allAttempts.reduce(
        (n, a) =>
          n +
          (a._professorScoring?.denominator
            ? Math.max(
                0,
                a._professorScoring.denominator -
                  (byAttempt.get(a.id)?.length ?? 0),
              )
            : 0),
        0,
      ),
      href: "/dashboard/attempts",
    },
    {
      id: "no-answers",
      type: "Tentatives sans réponse",
      detail:
        "Aucune réponse enregistrée. Cela ne définit pas le nombre de questions manquantes.",
      count: study.allAttempts.filter((a) => !byAttempt.get(a.id)?.length)
        .length,
      href: "/dashboard/attempts",
    },
    {
      id: "version",
      type: "Versions historiques non établies",
      detail: "Aucun contexte de calcul confirmé. Aucun recalcul automatique.",
      count: study.allAttempts.filter((a) => !a._professorScoring).length,
      href: "/dashboard/attempts",
    },
    {
      id: "orphan-answers",
      type: "Réponses orphelines",
      detail: "Contrôle global : tentative parente absente.",
      count: study.orphanAnswers,
      href: "/dashboard/answers",
    },
    {
      id: "orphan-attempts",
      type: "Tentatives orphelines",
      detail: "Contrôle global : compte propriétaire absent.",
      count: study.orphanAttempts,
      href: "/dashboard/attempts",
    },
    {
      id: "dates",
      type: "Horodatages invalides",
      detail:
        "Début absent/invalide, ou fin absente/incohérente pour une tentative terminée.",
      count: study.allAttempts.filter(
        (a) =>
          !Number.isFinite(Date.parse(a.startedAt)) ||
          (a.status === "completed" &&
            (!Number.isFinite(Date.parse(a.completedAt)) ||
              Date.parse(a.completedAt) < Date.parse(a.startedAt))),
      ).length,
      href: "/dashboard/attempts",
    },
    {
      id: "incomplete",
      type: "Tentatives non terminées",
      detail: "Ne pas confondre statut en cours et abandon.",
      count: study.allAttempts.filter((a) => a.status !== "completed").length,
      href: "/dashboard/attempts?status=in-progress",
    },
    {
      id: "discrepancy",
      type: "Scores / réponses à vérifier",
      detail:
        "Total enregistré différent du nombre de réponses correctes présentes. Diagnostic, pas correction automatique.",
      count: study.allAttempts.filter(
        (a) =>
          (byAttempt.get(a.id) ?? []).filter((r) => r.isCorrect && !r.isSkipped)
            .length !== a.scores?.total,
      ).length,
      href: "/dashboard/attempts",
    },
  ];
  return rows;
}
