import { randomBytes, createHmac } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import type { Db } from "mongodb";
import type { Actor, Query, Resource, Row } from "./types";
import { listRecords, loadStudy, requireActor } from "./service";

export function csv(columns: string[], rows: unknown[][]) {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number")
      return Number.isFinite(value) ? String(value) : "";
    let s = String(value);
    if (/^[\s]*[=+\-@]/.test(s) || /^[\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [columns, ...rows].map((row) => row.map(escape).join(",")).join("\r\n") +
    "\r\n"
  );
}
export async function datasetExport(
  db: Db,
  actor: Actor,
  q: Query,
  identified: boolean,
  source?: Resource,
) {
  await requireActor(db, actor.id);
  let users: Row[] = [],
    attempts: Row[] = [],
    answers: Row[] = [];
  if (source && source !== "activity") {
    const first = await listRecords(db, source, {
      ...q,
      page: 1,
      pageSize: 100,
    });
    const rows = [...first.items];
    for (let page = 2; page <= Math.ceil(first.total / 100); page++)
      rows.push(
        ...(await listRecords(db, source, { ...q, page, pageSize: 100 })).items,
      );
    if (source === "accounts") users = rows;
    if (source === "attempts") attempts = rows;
    if (source === "answers") answers = rows;
  } else {
    const study = await loadStudy(db, q);
    attempts = q.selection === "all" ? study.allAttempts : study.attempts;
    const ids = new Set(attempts.map((a) => a.id));
    answers = study.answers.filter((a) => ids.has(a.attemptId));
    users = study.users.filter(
      (u) =>
        (!q.students.length || q.students.includes(u.id)) &&
        (!q.userId || q.userId === u.id),
    );
  }
  const salt = randomBytes(32);
  const pseudo = (value: unknown, prefix: string) =>
    value
      ? `${prefix}_${createHmac("sha256", salt).update(String(value)).digest("hex").slice(0, 16)}`
      : "";
  const identity = (v: unknown, p: string) =>
    identified ? String(v ?? "") : pseudo(v, p);
  const accountCols = [
    "participant_id",
    ...(identified ? ["prenom", "nom", "email"] : []),
    "role",
    "age",
    "inscription_iso",
  ];
  const accountRows = users.map((u) => [
    identity(u.id, "P"),
    ...(identified ? [u.name, u.lastName, u.email] : []),
    u.role,
    u.age,
    u.createdAt,
  ]);
  const attemptCols = [
    "tentative_id",
    "participant_id",
    "statut",
    "debut_iso",
    "fin_iso",
    "phase",
    "pretest_brut",
    "phase1_brut",
    "phase2_brut",
    "phase3_brut",
    "phase4_brut",
    "posttest_brut",
    "total_enregistre",
    "pourcentage_enregistre",
    "denominateur_confirme",
    "reference_calcul",
  ];
  const attemptRows = attempts.map((a) => [
    identity(a.id, "T"),
    identity(a.userId, "P"),
    a.status,
    a.startedAt,
    a.completedAt,
    a.currentPhase,
    ...[
      "preTest",
      "phase1",
      "phase2",
      "phase3",
      "phase4",
      "postTest",
      "total",
      "percentage",
    ].map((k) => a.scores?.[k]),
    a._professorScoring?.denominator,
    a._professorScoring?.reference,
  ]);
  const answerCols = [
    "reponse_id",
    "tentative_id",
    "question_id",
    "type",
    "phase",
    "choix_enregistre",
    "correcte",
    "passee",
    "temps_secondes",
    "reponse_iso",
    "cle_option",
    "cles_traitements",
  ];
  const answerRows = answers.map((a) => [
    identity(a.id, "R"),
    identity(a.attemptId, "T"),
    a.questionId,
    a.questionType,
    a.phase,
    a.selectedOptionId,
    a.isCorrect ? 1 : 0,
    a.isSkipped ? 1 : 0,
    a.timeSpent > 0 ? a.timeSpent : null,
    a.answeredAt,
    a.correctOptionId,
    Array.isArray(a.correctTreatmentIds)
      ? JSON.stringify(a.correctTreatmentIds)
      : null,
  ]);
  const generatedAt = new Date().toISOString();
  const manifest = {
    title: "ResusSkills — données de recherche",
    generatedAt,
    revision:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.APP_REVISION ??
      "local-unversioned",
    mode: identified ? "identified" : "pseudonymous",
    source: source ?? "study",
    filters: identified
      ? q
      : {
          ...q,
          search: q.search ? "[texte de recherche masqué]" : "",
          students: q.students.map((v) => pseudo(v, "P")),
          userId: pseudo(q.userId, "P"),
          attemptId: pseudo(q.attemptId, "T"),
          ids: q.ids.map((v) =>
            pseudo(
              v,
              source === "accounts" ? "P" : source === "answers" ? "R" : "T",
            ),
          ),
        },
    timezone: "Africa/Casablanca",
    counts: {
      accounts: users.length,
      attempts: attempts.length,
      answers: answers.length,
    },
    missing:
      "Champ CSV vide = inconnu / non disponible. Zéro n’est pas imputé.",
    pseudonyms: identified
      ? "Identifiants réels"
      : "Identifiants cohérents entre les fichiers de ce paquet, renouvelés à chaque export. La pseudonymisation ne garantit pas l’anonymat.",
    limitations: [
      "Versions historiques des questionnaires non établies sauf référence confirmée.",
      "Les temps nuls sont exportés comme manquants.",
      "Les scores enregistrés et l’exactitude des réponses sont deux mesures distinctes.",
      "Une ligne par enregistrement ; les filtres ne correspondent pas à la seule page visible.",
    ],
  };
  const dictionary = `# Dictionnaire — ResusSkills\n\nGénéré : ${generatedAt}\n\n## Format\nCSV UTF-8 avec BOM, séparateur virgule, guillemets doubles. Dates ISO 8601. Nombres avec point décimal. Cellule vide : valeur manquante. Booléens : 1 / 0. Les chaînes pouvant être interprétées comme formules sont précédées d’une apostrophe.\n\n## Relations\nparticipant_id relie comptes et tentatives. tentative_id relie tentatives et réponses. Les pseudonymes sont spécifiques à ce paquet. Un export ciblé peut ne contenir que la table sélectionnée.\n\n## Comptes\nrole : student ou professor. age : âge enregistré, pas l’âge au moment du test. inscription_iso : création du compte. Nom/email et identifiants réels uniquement en mode identifié.\n\n## Tentatives\nLes champs *_brut comptent les réponses correctes enregistrées par section. pourcentage_enregistre est le résultat historique stocké, non recalculé à l’export. denominateur_confirme et reference_calcul sont absents si la base historique n’a pas été confirmée. statut : in-progress, completed ou abandoned. Les dates de début/fin ne mesurent pas un temps actif.\n\n## Réponses\nchoix_enregistre peut contenir un identifiant de QCM ou une liste de traitements encodée. correcte/passee : indicateurs enregistrés. temps_secondes : durée strictement positive uniquement, sinon vide. cle_option/cles_traitements : clés historiques enregistrées ; absence ne signifie pas réponse incorrecte.\n\n## Reproductibilité\nVoir manifest.json pour les filtres, effectifs, mode de sélection, revision et limites. Les corrections administratives peuvent modifier des exports ultérieurs.\n`;
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "dictionnaire.md": strToU8(dictionary),
  };
  if (!source || source === "accounts")
    files["comptes.csv"] = strToU8(csv(accountCols, accountRows));
  if (!source || source === "attempts")
    files["tentatives.csv"] = strToU8(csv(attemptCols, attemptRows));
  if (!source || source === "answers")
    files["reponses.csv"] = strToU8(csv(answerCols, answerRows));
  await db
    .collection("professoraudit")
    .insertOne({
      kind: "event",
      action: "export.dataset",
      actorId: actor.id,
      actorName: actor.name,
      targetId: source ?? "study",
      reason: identified
        ? "Export identifié confirmé"
        : "Export de recherche pseudonymisé",
      createdAt: new Date(),
      affected: manifest.counts,
      filters: q,
      identified,
    });
  return {
    bytes: zipSync(files),
    filename: `resusskills-${identified ? "identifie" : "recherche"}-${generatedAt.slice(0, 10)}.zip`,
    counts: manifest.counts,
  };
}
