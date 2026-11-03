import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical, ArrowUpRight } from "lucide-react";
import { professorContext } from "@/lib/professor/context";
import {
  getRecord,
  listRecords,
  loadStudy,
  ProfessorError,
} from "@/lib/professor/service";
import { parseQuery } from "@/lib/professor/query";
import {
  overviewMetrics,
  scoreMetrics,
  scoreFigures,
  phaseFigure,
  prePostFigures,
  questionFigures,
  progressionFigures,
  timingFigures,
  qualityRows,
} from "@/lib/professor/analytics";
import type { Metric, Resource, AnalyticsView } from "@/lib/professor/types";
import { Filters } from "./filters";
import { ResourceTable } from "./resource-table";
import { ChartPanel } from "./chart";
import { Notice } from "./ui";
import { DetailActions, Preferences } from "./detail-actions";
import { ExportWizard } from "./export-wizard";
import AnimatedList from "./react-bits/animated-list";
type Search = Record<string, string | string[] | undefined>;
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="p-page-header">
      <div>
        <div className="p-kicker">
          <FlaskConical size={14} />
          ESPACE RECHERCHE
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="p-page-actions">{children}</div>}
    </header>
  );
}
function Metrics({ items }: { items: Metric[] }) {
  return (
    <div className="p-metrics">
      {items.map((m) => (
        <section className="p-metric" key={m.label}>
          <div className="p-metric-label">{m.label}</div>
          <div className="p-metric-value">{m.value}</div>
          <div className="p-metric-detail">{m.detail}</div>
        </section>
      ))}
    </div>
  );
}
const historical =
  "Les questionnaires historiques ne sont pas versionnés. Les scores enregistrés sont conservés ; l’exactitude des réponses utilise uniquement les réponses observées. Aucune normalisation sur la banque actuelle.";
async function students(
  db: Awaited<ReturnType<typeof professorContext>>["db"],
) {
  return (
    await db
      .collection("users")
      .find({}, { projection: { name: 1, lastName: 1 } })
      .sort({ name: 1, _id: 1 })
      .toArray()
  ).map((u) => ({ id: String(u._id), name: `${u.name} ${u.lastName}` }));
}
export async function OverviewPage({ search }: { search: Search }) {
  const ctx = await professorContext(),
    q = parseQuery(search);
  q.selection = "all";
  const study = await loadStudy(ctx.db, q, true),
    recent = await listRecords(ctx.db, "activity", {
      ...q,
      page: 1,
      pageSize: 25,
    });
  return (
    <>
      <PageHeader
        title="Vue d’ensemble"
        description="Suivre l’activité, examiner les résultats enregistrés et préparer vos analyses."
      >
        <Link className="p-chip" href="/dashboard/exports">
          Exporter les données <ArrowUpRight size={14} />
        </Link>
      </PageHeader>
      <Filters query={q} />
      <Metrics items={overviewMetrics(study)} />
      <div className="p-grid">
        {[scoreFigures(study)[0], phaseFigure(study)].map((f) => (
          <ChartPanel key={f.id} figure={f} query={q} />
        ))}
      </div>
      <Notice>{historical}</Notice>
      <div className="p-grid">
        <section className="p-panel">
          <div className="p-panel-head">
            <div>
              <h2>Axes de recherche</h2>
              <p>Approfondir une question, avec sa méthode et ses limites.</p>
            </div>
          </div>
          <AnimatedList
            items={[
              [
                "scores",
                "Distribution des scores",
                "Moyenne, médiane, dispersion et quartiles",
              ],
              [
                "pre-post",
                "Comparaison pré / post",
                "Résultats appariés dans une même tentative",
              ],
              [
                "questions",
                "Analyse des questions",
                "Clés enregistrées, choix et traitements",
              ],
              [
                "timing",
                "Temps de réponse",
                "Couverture et distributions des durées positives",
              ],
            ].map(([id, title, detail]) => ({
              id,
              content: (
                <Link href={`/dashboard/analytics/${id}`}>
                  <h3>{title} ↗</h3>
                  <p>{detail}</p>
                </Link>
              ),
            }))}
          />
        </section>
        <section className="p-panel">
          <div className="p-panel-head">
            <div>
              <h2>Dernières opérations</h2>
              <p>Corrections, gestion et exports journalisés.</p>
            </div>
            <Link href="/dashboard/activity">Tout voir →</Link>
          </div>
          {recent.items.length ? (
            <AnimatedList
              items={recent.items.slice(0, 5).map((r) => ({
                id: r.id,
                content: (
                  <div>
                    <h3>{r.action}</h3>
                    <p>
                      {r.actorName} · {r.reason}
                    </p>
                  </div>
                ),
              }))}
            />
          ) : (
            <div className="p-panel-body">
              <p>Aucune opération administrative enregistrée.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export async function DirectoryPage({
  resource,
  search,
}: {
  resource: Resource;
  search: Search;
}) {
  const ctx = await professorContext(),
    q = parseQuery(search),
    result = await listRecords(ctx.db, resource, q);
  const titles = {
    accounts: [
      "Comptes",
      "Gérer les profils, les rôles et les accès, y compris les comptes sans tentative.",
    ],
    attempts: [
      "Tentatives",
      "Explorer toutes les tentatives, terminées ou incomplètes. Les scores sont ceux enregistrés.",
    ],
    answers: [
      "Réponses",
      "Examiner les choix enregistrés, la correction et les durées disponibles.",
    ],
    activity: [
      "Journal d’activité",
      "Historique opérationnel des modifications et exports. Les événements ne sont pas modifiables.",
    ],
  };
  return (
    <>
      <PageHeader
        title={titles[resource][0]}
        description={titles[resource][1]}
      />
      <Filters
        key={JSON.stringify(q)}
        query={q}
        resource={resource}
        students={resource === "activity" ? [] : await students(ctx.db)}
      />
      {resource === "answers" && (
        <Notice>
          Le contenu historique des questions n’est pas établi. L’identifiant et
          les clés affichés proviennent de la réponse enregistrée.
        </Notice>
      )}
      <ResourceTable resource={resource} result={result} query={q} />
    </>
  );
}
const analysisNames: Record<AnalyticsView, [string, string]> = {
  scores: [
    "Scores & distributions",
    "Décrire la distribution des pourcentages enregistrés sans recalculer les résultats historiques.",
  ],
  "pre-post": [
    "Pré-test / post-test",
    "Comparer les réponses observées au sein de la même tentative, sans conclusion causale.",
  ],
  questions: [
    "Analyse des questions",
    "Repérer les profils de réponse par identifiant et clé de correction enregistrée.",
  ],
  progression: [
    "Progression & participation",
    "Décrire les tentatives répétées et les étapes atteintes.",
  ],
  timing: [
    "Temps de réponse",
    "Examiner les durées réellement disponibles et leur couverture.",
  ],
};
export async function AnalyticsPage({
  view,
  search,
}: {
  view: AnalyticsView;
  search: Search;
}) {
  if (!analysisNames[view]) notFound();
  const ctx = await professorContext(),
    q = parseQuery(search, true),
    study = await loadStudy(ctx.db, q);
  const figures = {
    scores: scoreFigures,
    "pre-post": prePostFigures,
    questions: questionFigures,
    progression: progressionFigures,
    timing: timingFigures,
  }[view](study);
  return (
    <>
      <PageHeader
        title={analysisNames[view][0]}
        description={analysisNames[view][1]}
      />
      <Filters
        key={JSON.stringify(q)}
        query={q}
        research
        students={await students(ctx.db)}
      />
      <Metrics items={scoreMetrics(study)} />
      <Notice>
        {historical} Population :{" "}
        {q.selection === "all"
          ? "toutes les tentatives terminées (pondération par tentative)"
          : "une tentative terminée par étudiant dans la période"}
        . {study.allAttempts.length - study.attempts.length} tentative(s) non
        retenue(s) par cette sélection.
      </Notice>
      <div className="p-grid">
        {figures.map((f) => (
          <ChartPanel key={f.id} figure={f} query={q} />
        ))}
      </div>
    </>
  );
}
export async function QualityPage({ search }: { search: Search }) {
  const ctx = await professorContext(),
    q = parseQuery(search),
    study = await loadStudy(
      ctx.db,
      { ...q, phase: "", question: "", availability: "" },
      true,
    );
  return (
    <>
      <PageHeader
        title="Qualité des données"
        description="Identifier les limites de couverture et les incohérences avant une analyse. Aucun résultat n’est modifié automatiquement."
      />
      <Filters query={q} />
      <Notice>{historical}</Notice>
      <section className="p-panel">
        <AnimatedList
          items={qualityRows(study).map((r) => ({
            id: r.id,
            content: (
              <>
                <div>
                  <h3>{r.type}</h3>
                  <p>{r.detail}</p>
                  <Link href={r.href}>Explorer les enregistrements →</Link>
                </div>
                <span className="p-quality-count">{r.count}</span>
              </>
            ),
          }))}
        />
      </section>
    </>
  );
}
export async function ExportsPage({ search }: { search: Search }) {
  await professorContext();
  const q = parseQuery(search, true);
  return (
    <>
      <PageHeader
        title="Exports de recherche"
        description="Préparer un jeu de données documenté ou une figure prête à partager."
      />
      <Filters query={q} research />
      <div className="p-panel">
        <div className="p-panel-head">
          <h2>Configurer un paquet de données</h2>
        </div>
        <div className="p-panel-body">
          <ExportWizard key={JSON.stringify(q)} query={q} />
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Notice>
          Chaque figure possède son propre export SVG / PNG avec aperçu, thème
          de publication et choix de périmètre. Ouvrez une page d’analyse, puis
          utilisez l’icône de téléchargement du graphique.
        </Notice>
      </div>
    </>
  );
}
export async function DetailPage({
  resource,
  id,
  search,
}: {
  resource: "accounts" | "attempts" | "answers";
  id: string;
  search: Search;
}) {
  const ctx = await professorContext();
  let row;
  try {
    row = await getRecord(ctx.db, resource, id);
  } catch (e) {
    if (
      e instanceof ProfessorError &&
      ["NOT_FOUND", "VALIDATION"].includes(e.code)
    )
      notFound();
    throw e;
  }
  const q = parseQuery({
    ...search,
    ...(resource === "accounts"
      ? { userId: id }
      : { attemptId: resource === "attempts" ? id : row.attemptId }),
  });
  const related = resource === "accounts" ? "attempts" : "answers";
  const result =
    resource === "answers" ? null : await listRecords(ctx.db, related, q);
  const title =
    resource === "accounts"
      ? `${row.name} ${row.lastName}`
      : resource === "attempts"
        ? "Fiche de tentative"
        : `Réponse · ${row.questionId}`;
  const entries =
    resource === "accounts"
      ? [
          ["Email", row.email],
          ["Âge", row.age ?? "Non renseigné"],
          ["Rôle", row.role],
          [
            "Fournisseurs",
            row.providers?.map((p: any) => p.provider).join(", ") ||
              "Identifiants locaux",
          ],
        ]
      : resource === "attempts"
        ? [
            ["Statut", row.status],
            ["Début", row.startedAt],
            ["Fin", row.completedAt ?? "—"],
            [
              "Score enregistré",
              row.scores?.percentage == null
                ? "—"
                : `${row.scores.percentage} %`,
            ],
            ["Total brut", row.scores?.total ?? "—"],
            [
              "Base historique",
              row._professorScoring?.reference ?? "Non établie",
            ],
          ]
        : [
            ["Type", row.questionType],
            ["Phase", row.phase],
            ["Choix", row.selectedOptionId ?? "—"],
            [
              "Correction",
              row.isSkipped
                ? "Passée"
                : row.isCorrect
                  ? "Correcte"
                  : "Incorrecte",
            ],
            [
              "Durée positive (s)",
              row.timeSpent > 0 ? row.timeSpent : "Indisponible",
            ],
            [
              "Clé enregistrée",
              row.correctOptionId ||
                row.correctTreatmentIds?.join(", ") ||
                "Absente",
            ],
          ];
  return (
    <>
      <PageHeader title={title} description={`Identifiant : ${id}`}>
        <DetailActions resource={resource} row={row} />
      </PageHeader>
      <div className="p-grid">
        <section className="p-panel">
          <div className="p-panel-head">
            <h2>Enregistrement</h2>
          </div>
          <div className="p-panel-body">
            <dl className="p-definition">
              {entries.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
            {resource === "attempts" && (
              <Link href={`/dashboard/accounts/${row.userId}`}>
                Ouvrir le compte propriétaire →
              </Link>
            )}
            {resource === "answers" && (
              <Link href={`/dashboard/attempts/${row.attemptId}`}>
                Ouvrir la tentative →
              </Link>
            )}
          </div>
        </section>
        <section className="p-panel">
          <div className="p-panel-head">
            <h2>
              {resource === "accounts"
                ? "Historique & administration"
                : "Intégrité historique"}
            </h2>
          </div>
          <div className="p-panel-body">
            <Notice>{historical}</Notice>
            {resource === "accounts" && (
              <Link href={`/dashboard/answers?userId=${id}`}>
                Explorer toutes les réponses de ce compte →
              </Link>
            )}
            {resource === "attempts" && (
              <dl className="p-definition">
                {Object.entries(row.scores ?? {})
                  .filter(([k]) => !["total", "percentage"].includes(k))
                  .map(([k, v]) => (
                    <div style={{ display: "contents" }} key={k}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {resource === "answers" && (
              <p>
                Question non résolue historiquement : le texte de la banque
                actuelle n’est pas présenté comme un contenu historique vérifié.
              </p>
            )}
          </div>
        </section>
      </div>
      {resource === "accounts" && (
        <Link
          className="p-chip"
          href={`/dashboard/analytics/progression?userId=${id}`}
        >
          Analyser la progression descriptive →
        </Link>
      )}
      {result && (
        <>
          <div style={{ marginTop: 24 }}>
            <Filters query={q} resource={related} />
          </div>
          <ResourceTable
            resource={related}
            result={result}
            query={q}
            defaults={
              resource === "accounts" ? { userId: id } : { attemptId: id }
            }
          />
        </>
      )}
    </>
  );
}
export async function SettingsPage() {
  const ctx = await professorContext(),
    row = await getRecord(ctx.db, "accounts", ctx.actor.id);
  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Gérer votre profil et les préférences de cet appareil."
      />
      <div className="p-grid">
        <section className="p-panel">
          <div className="p-panel-head">
            <h2>Profil professeur</h2>
          </div>
          <div className="p-panel-body">
            <p>
              {row.name} {row.lastName}
            </p>
            <p>{row.email}</p>
            <div style={{ marginTop: 20 }}>
              <DetailActions resource="accounts" row={row} settings />
            </div>
          </div>
        </section>
        <section className="p-panel">
          <div className="p-panel-head">
            <h2>Affichage</h2>
          </div>
          <div className="p-panel-body">
            <Preferences />
            <p className="p-form-note">
              Le bouton soleil / lune de la barre supérieure change le thème.
              Les préférences sont limitées à cet espace professeur. Dates
              affichées dans Africa/Casablanca.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
