import { createHash, randomUUID } from "node:crypto";
import { Db, MongoClient, ObjectId, type ClientSession } from "mongodb";
import bcrypt from "bcryptjs";
import bank from "@/data/question-bank.json";
const currentQuestionIds = [
  ...bank.preTest.map((q) => q.id),
  ...bank.postTest.map((q) => q.id),
  ...bank.phases.flatMap((p) => p.cases.map((c) => c.id)),
];
import { z } from "zod";
import { dateRange, escapeRegex } from "./query";
import type {
  Actor,
  MutationInput,
  PageResult,
  Query,
  Resource,
  Row,
  Study,
} from "./types";

export class ProfessorError extends Error {
  constructor(
    message: string,
    public code = "VALIDATION",
  ) {
    super(message);
  }
}
const collections = {
  accounts: "users",
  attempts: "quizattempts",
  answers: "useranswers",
  activity: "professoraudit",
};
const secrets = new Set([
  "password",
  "access_token",
  "refresh_token",
  "id_token",
  "session_token",
  "sessionToken",
]);
export function safe(value: any): any {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !secrets.has(k))
        .map(([k, v]) => [k, safe(v)]),
    );
  return value;
}
export const fingerprint = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(safe(value)))
    .digest("hex");
export function dto(doc: any): Row {
  return { ...safe(doc), id: String(doc._id), revision: fingerprint(doc) };
}
export function id(value: unknown) {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value))
    throw new ProfessorError("Identifiant invalide.");
  return new ObjectId(value);
}
export async function requireActor(
  db: Db,
  actorId: string,
  session?: ClientSession,
): Promise<Actor> {
  const user = await db
    .collection("users")
    .findOne(
      { _id: id(actorId) },
      { session, projection: { name: 1, lastName: 1, email: 1, role: 1 } },
    );
  if (!user || user.role !== "professor")
    throw new ProfessorError(
      "Votre session ne dispose plus des droits professeur.",
      "FORBIDDEN",
    );
  return {
    id: String(user._id),
    name: `${user.name} ${user.lastName}`,
    email: user.email,
    role: "professor",
  };
}
function studyMatch(q: Query) {
  const match: any = {};
  const range = dateRange(q);
  if (range) match.startedAt = range;
  const students = q.userId ? [q.userId] : q.students;
  if (students.length) match.userId = { $in: students.map(id) };
  if (q.attemptId) match._id = id(q.attemptId);
  if (q.status) match.status = q.status;
  if (q.minScore !== undefined || q.maxScore !== undefined)
    match["scores.percentage"] = {
      ...(q.minScore !== undefined ? { $gte: q.minScore } : {}),
      ...(q.maxScore !== undefined ? { $lte: q.maxScore } : {}),
    };
  return match;
}
export async function listRecords(
  db: Db,
  resource: Resource,
  q: Query,
): Promise<PageResult> {
  const match: any = resource === "attempts" ? studyMatch(q) : {};
  const pipeline: any[] = [];
  if (resource === "accounts") {
    if (q.role) match.role = q.role;
    if (q.userId) match._id = id(q.userId);
    if (q.students.length) match._id = { $in: q.students.map(id) };
    const range = dateRange(q);
    if (range) match.createdAt = range;
    pipeline.push(
      { $match: match },
      {
        $lookup: {
          from: "quizattempts",
          let: { user: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$user"] } } },
            {
              $group: {
                _id: null,
                attemptCount: { $sum: 1 },
                completedCount: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                bestScore: { $max: "$scores.percentage" },
              },
            },
          ],
          as: "stats",
        },
      },
      {
        $set: {
          attemptCount: { $ifNull: [{ $first: "$stats.attemptCount" }, 0] },
          completedCount: { $ifNull: [{ $first: "$stats.completedCount" }, 0] },
          bestScore: { $ifNull: [{ $first: "$stats.bestScore" }, null] },
        },
      },
      { $unset: ["password", "stats"] },
    );
  } else if (resource === "attempts") {
    pipeline.push(
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $set: {
          ownerName: {
            $concat: [
              { $ifNull: [{ $first: "$owner.name" }, "Compte supprimé"] },
              " ",
              { $ifNull: [{ $first: "$owner.lastName" }, ""] },
            ],
          },
          ownerEmail: { $first: "$owner.email" },
        },
      },
      { $unset: "owner" },
    );
  } else if (resource === "answers") {
    if (q.attemptId) match.attemptId = id(q.attemptId);
    if (q.phase) match.phase = q.phase;
    if (q.question) match.questionId = q.question;
    if (q.availability === "timed") match.timeSpent = { $gt: 0 };
    if (q.availability === "untimed")
      match.$or = [
        { timeSpent: { $lte: 0 } },
        { timeSpent: null },
        { timeSpent: { $exists: false } },
      ];
    if (q.availability === "skipped") match.isSkipped = true;
    if (q.availability === "unresolved")
      match.questionId = {
        $nin: currentQuestionIds,
        ...(q.question ? { $eq: q.question } : {}),
      };
    if (
      q.from ||
      q.to ||
      q.students.length ||
      q.userId ||
      q.status ||
      q.minScore !== undefined ||
      q.maxScore !== undefined
    ) {
      const attempts = await db
        .collection("quizattempts")
        .find(studyMatch(q), { projection: { _id: 1 } })
        .toArray();
      match.attemptId = { $in: attempts.map((a) => a._id) };
    }
    pipeline.push({ $match: match });
  } else {
    match.kind = "event";
    const range = dateRange(q);
    if (range) match.createdAt = range;
    pipeline.push({ $match: match });
  }
  if (q.ids.length) pipeline.push({ $match: { _id: { $in: q.ids.map(id) } } });
  if (q.search) {
    const fields =
      resource === "accounts"
        ? ["name", "lastName", "email"]
        : resource === "attempts"
          ? ["ownerName", "ownerEmail", "status"]
          : resource === "answers"
            ? ["questionId", "phase", "selectedOptionId"]
            : ["action", "actorName", "reason", "targetId"];
    pipeline.push({
      $match: {
        $or: fields.map((field) => ({
          [field]: { $regex: escapeRegex(q.search), $options: "i" },
        })),
      },
    });
  }
  const allowed =
    resource === "accounts"
      ? ["name", "email", "role", "createdAt", "attemptCount", "bestScore"]
      : resource === "attempts"
        ? [
            "ownerName",
            "startedAt",
            "status",
            "scores.percentage",
            "completedAt",
          ]
        : resource === "answers"
          ? ["questionId", "phase", "answeredAt", "isCorrect", "timeSpent"]
          : ["createdAt", "actorName", "action"];
  const sort = allowed.includes(q.sort)
    ? q.sort
    : resource === "accounts"
      ? "createdAt"
      : resource === "attempts"
        ? "startedAt"
        : resource === "answers"
          ? "answeredAt"
          : "createdAt";
  const counted = await db
    .collection(collections[resource])
    .aggregate([...pipeline, { $count: "total" }])
    .toArray();
  const total = counted[0]?.total ?? 0;
  const page = Math.min(q.page, Math.max(1, Math.ceil(total / q.pageSize)));
  const docs = await db
    .collection(collections[resource])
    .aggregate([
      ...pipeline,
      { $sort: { [sort]: q.direction === "asc" ? 1 : -1, _id: 1 } },
      { $skip: (page - 1) * q.pageSize },
      { $limit: q.pageSize },
    ])
    .toArray();
  // Revision tokens refer to stored documents, not joined display fields.
  const originals = await db
    .collection(collections[resource])
    .find({ _id: { $in: docs.map((d) => d._id) } })
    .toArray();
  const revisions = new Map(
    originals.map((d) => [String(d._id), fingerprint(d)]),
  );
  return {
    items: docs.map((d) => ({
      ...dto(d),
      revision: revisions.get(String(d._id))!,
    })),
    total,
    page,
    pageSize: q.pageSize,
  };
}
export async function getRecord(db: Db, resource: Resource, recordId: string) {
  const doc = await db
    .collection(collections[resource])
    .findOne({ _id: id(recordId) });
  if (!doc)
    throw new ProfessorError("Cet enregistrement n’existe plus.", "NOT_FOUND");
  const result = dto(doc);
  if (resource === "accounts")
    result.providers = await db
      .collection("accounts")
      .find(
        { userId: id(recordId) },
        { projection: { _id: 0, provider: 1, type: 1 } },
      )
      .toArray();
  return result;
}
export async function loadStudy(
  db: Db,
  q: Query,
  includeProfessorAttempts = false,
): Promise<Study> {
  const users = await db
    .collection("users")
    .find(includeProfessorAttempts ? {} : { role: "student" }, {
      projection: { password: 0 },
    })
    .toArray();
  const userIds = users.map((u) => u._id);
  const raw = await db
    .collection("quizattempts")
    .find({
      ...studyMatch(q),
      userId: {
        $in: userIds
          .filter((u) => !q.students.length || q.students.includes(String(u)))
          .filter((u) => !q.userId || q.userId === String(u)),
      },
    })
    .sort({ startedAt: 1, _id: 1 })
    .toArray();
  const allAttempts = raw.map(dto);
  let attempts = allAttempts.filter((a) => a.status === "completed");
  if (q.selection !== "all") {
    const groups = new Map<string, Row>();
    for (const a of attempts) {
      if (q.selection === "latest" || !groups.has(a.userId))
        groups.set(a.userId, a);
    }
    attempts = [...groups.values()];
  }
  let answers = (
    await db
      .collection("useranswers")
      .find({ attemptId: { $in: raw.map((a) => a._id) } })
      .toArray()
  ).map(dto);
  if (q.phase) answers = answers.filter((a) => a.phase === q.phase);
  if (q.question) answers = answers.filter((a) => a.questionId === q.question);
  if (q.availability === "timed")
    answers = answers.filter((a) => a.timeSpent > 0);
  if (q.availability === "untimed")
    answers = answers.filter((a) => !(a.timeSpent > 0));
  if (q.availability === "skipped")
    answers = answers.filter((a) => a.isSkipped);
  if (q.availability === "unresolved")
    answers = answers.filter((a) => !currentQuestionIds.includes(a.questionId));
  const [orphanAnswers, orphanAttempts] = await Promise.all([
    db
      .collection("useranswers")
      .aggregate([
        {
          $lookup: {
            from: "quizattempts",
            localField: "attemptId",
            foreignField: "_id",
            as: "parent",
          },
        },
        { $match: { parent: { $size: 0 } } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("quizattempts")
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "parent",
          },
        },
        { $match: { parent: { $size: 0 } } },
        { $count: "n" },
      ])
      .toArray(),
  ]);
  return {
    attempts,
    allAttempts,
    answers,
    users: users.map(dto),
    query: q,
    registeredStudents: users.filter((u) => u.role === "student").length,
    orphanAnswers: orphanAnswers[0]?.n ?? 0,
    orphanAttempts: orphanAttempts[0]?.n ?? 0,
  };
}

const dateInput = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))),
    "Utilisez une date ISO avec fuseau (Z ou +01:00).",
  );
const scoreSchema = z.object({
  preTest: z.number().int().min(0),
  phase1: z.number().int().min(0),
  phase2: z.number().int().min(0),
  phase3: z.number().int().min(0),
  phase4: z.number().int().min(0),
  postTest: z.number().int().min(0),
});
const accountSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    lastName: z.string().trim().min(2).max(100),
    email: z.email().toLowerCase(),
    role: z.enum(["student", "professor"]),
    age: z.number().int().min(10).max(120).nullable().optional(),
    password: z.string().min(12).max(128).optional(),
  })
  .strict();
const attemptSchema = z
  .object({
    userId: z.string().regex(/^[a-f\d]{24}$/i),
    status: z.enum(["in-progress", "completed", "abandoned"]),
    startedAt: dateInput,
    completedAt: dateInput.nullable().optional(),
    currentPhase: z.enum([
      "preTest",
      "phase-1",
      "phase-2",
      "phase-3",
      "phase-4",
      "postTest",
    ]),
    currentQuestionIndex: z.number().int().min(0).max(1000),
    scores: scoreSchema.optional(),
  })
  .strict();
const answerSchema = z
  .object({
    attemptId: z.string().regex(/^[a-f\d]{24}$/i),
    questionId: z.string().trim().min(1).max(100),
    questionType: z.enum(["mcq", "clinical-case"]),
    phase: z.enum([
      "preTest",
      "phase-1",
      "phase-2",
      "phase-3",
      "phase-4",
      "postTest",
    ]),
    selectedOptionId: z.string().max(10000).nullable(),
    isCorrect: z.boolean(),
    isSkipped: z.boolean(),
    timeSpent: z.number().min(0).max(86400).nullable().optional(),
    answeredAt: dateInput,
    correctOptionId: z.string().max(100).optional(),
    correctTreatmentIds: z.array(z.string().max(100)).max(100).optional(),
    confirmCorrectness: z.boolean().optional(),
  })
  .strict();
export function parseTreatment(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
  } catch {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
}
export function scoreAnswers(answers: any[], denominator: number) {
  if (!Number.isInteger(denominator) || denominator < 1 || denominator > 10000)
    throw new ProfessorError(
      "Confirmez un nombre total de questions valide.",
      "SCORING_REQUIRED",
    );
  const scores = {
    preTest: 0,
    phase1: 0,
    phase2: 0,
    phase3: 0,
    phase4: 0,
    postTest: 0,
    total: 0,
    percentage: 0,
  };
  for (const a of answers)
    if (a.isCorrect && !a.isSkipped) {
      const key = String(a.phase).replace("-", "") as keyof typeof scores;
      if (
        [
          "preTest",
          "phase1",
          "phase2",
          "phase3",
          "phase4",
          "postTest",
        ].includes(key)
      ) {
        scores[key]++;
        scores.total++;
      }
    }
  if (scores.total > denominator || answers.length > denominator)
    throw new ProfessorError(
      "Le dénominateur est inférieur au nombre de réponses.",
    );
  scores.percentage = Math.round((scores.total / denominator) * 100);
  return scores;
}
export interface MutationPreview {
  token: string;
  before: any;
  after: any;
  affected: Record<string, number>;
  warnings: string[];
  scores?: any;
  requiresScoring: boolean;
  confirmation: string;
}
type Context = { db: Db; client: MongoClient; actor: Actor };
async function prepare(
  ctx: Context,
  input: MutationInput,
  session?: ClientSession,
) {
  const { db } = ctx;
  const resource = input.resource;
  if (!["accounts", "attempts", "answers"].includes(resource))
    throw new ProfessorError("Type invalide.");
  if (!["create", "update", "delete", "password"].includes(input.operation))
    throw new ProfessorError("Action invalide.");
  if (input.operation === "password" && resource !== "accounts")
    throw new ProfessorError("Action invalide.");
  const collection = db.collection(collections[resource]);
  const before =
    input.operation === "create"
      ? null
      : await collection.findOne({ _id: id(input.id) }, { session });
  if (input.operation !== "create" && !before)
    throw new ProfessorError("Enregistrement introuvable.", "NOT_FOUND");
  if (before && fingerprint(before) !== input.revision)
    throw new ProfessorError(
      "Cet enregistrement a changé. Rechargez la page avant de réessayer.",
      "CONFLICT",
    );
  let data: any = {};
  const warnings: string[] = [];
  const affected: Record<string, number> = { [resource]: 1 };
  let parent: any = null;
  let answers: any[] = [];
  let scores: any;
  let requiresScoring = false;
  if (input.operation !== "delete") {
    data =
      input.operation === "password"
        ? z
            .object({ password: z.string().min(12).max(128) })
            .strict()
            .parse(input.data)
        : (resource === "accounts"
            ? accountSchema
            : resource === "attempts"
              ? attemptSchema
              : answerSchema
          ).parse(input.data);
    if (resource === "accounts") {
      if (input.operation === "create" && !data.password)
        throw new ProfessorError(
          "Un mot de passe de 12 caractères minimum est requis.",
        );
      if (input.operation === "update" && data.password)
        throw new ProfessorError(
          "Utilisez l’action de réinitialisation du mot de passe.",
        );
      if (
        data.email &&
        (await collection.findOne(
          {
            email: data.email,
            ...(before ? { _id: { $ne: before._id } } : {}),
          },
          { session },
        ))
      )
        throw new ProfessorError("Cette adresse email est déjà utilisée.");
    }
    if (resource === "attempts") {
      if (
        !(await db
          .collection("users")
          .findOne({ _id: id(data.userId) }, { session }))
      )
        throw new ProfessorError("Compte propriétaire introuvable.");
      if (!data.startedAt)
        throw new ProfessorError("La date de début est obligatoire.");
      data.userId = id(data.userId);
      data.startedAt = new Date(data.startedAt);
      data.completedAt = data.completedAt ? new Date(data.completedAt) : null;
      if (data.status === "completed" && !data.completedAt)
        throw new ProfessorError(
          "Une tentative terminée doit avoir une date de fin.",
        );
      if (data.completedAt && data.completedAt < data.startedAt)
        throw new ProfessorError("La date de fin précède la date de début.");
    }
    if (resource === "answers") {
      if (!data.answeredAt)
        throw new ProfessorError("La date de réponse est obligatoire.");
      data.attemptId = id(data.attemptId);
      data.answeredAt = new Date(data.answeredAt);
      if (before && String(before.attemptId) !== String(data.attemptId))
        throw new ProfessorError(
          "Le rattachement est immuable. Créez une nouvelle réponse pour une autre tentative.",
        );
      if (
        await collection.findOne(
          {
            attemptId: data.attemptId,
            questionId: data.questionId,
            ...(before ? { _id: { $ne: before._id } } : {}),
          },
          { session },
        )
      )
        throw new ProfessorError(
          "Cette tentative possède déjà une réponse à cette question.",
        );
      const key = data.correctTreatmentIds ?? before?.correctTreatmentIds;
      const option = data.correctOptionId ?? before?.correctOptionId;
      if (data.isSkipped) {
        data.isCorrect = false;
        data.selectedOptionId = null;
      } else if (key?.length) {
        const selected = [...new Set(parseTreatment(data.selectedOptionId))];
        data.isCorrect =
          selected.length === key.length &&
          key.every((v: string) => selected.includes(v));
        data.correctTreatmentIds = key;
      } else if (option) {
        data.isCorrect = data.selectedOptionId === option;
        data.correctOptionId = option;
      } else if (!data.confirmCorrectness)
        throw new ProfessorError(
          "Clé historique absente : confirmez explicitement la correction.",
          "CORRECTNESS_REQUIRED",
        );
      delete data.confirmCorrectness;
    }
  }
  if (
    resource === "accounts" &&
    (input.operation === "delete" || data.role === "student")
  ) {
    if (String(before?._id) === ctx.actor.id)
      throw new ProfessorError(
        "Vous ne pouvez pas supprimer ou rétrograder votre propre compte.",
      );
    if (
      before?.role === "professor" &&
      (await db
        .collection("users")
        .countDocuments({ role: "professor" }, { session })) <= 1
    )
      throw new ProfessorError("Le dernier professeur doit être conservé.");
  }
  if (resource === "accounts" && input.operation === "delete") {
    const owned = await db
      .collection("quizattempts")
      .find({ userId: before!._id }, { session, projection: { _id: 1 } })
      .toArray();
    affected.attempts = owned.length;
    affected.answers = await db
      .collection("useranswers")
      .countDocuments(
        { attemptId: { $in: owned.map((a) => a._id) } },
        { session },
      );
    affected.authLinks = await db
      .collection("accounts")
      .countDocuments({ userId: before!._id }, { session });
    answers = owned;
  }
  if (resource === "attempts" && input.operation === "delete") {
    answers = await db
      .collection("useranswers")
      .find({ attemptId: before!._id }, { session })
      .toArray();
    affected.answers = answers.length;
  }
  if (resource === "answers") {
    const attemptId = data.attemptId ?? before?.attemptId;
    parent = await db
      .collection("quizattempts")
      .findOne({ _id: attemptId }, { session });
    if (!parent && input.operation !== "delete")
      throw new ProfessorError("Tentative parente introuvable.");
    const scoringFields = [
      "questionId",
      "questionType",
      "phase",
      "selectedOptionId",
      "correctOptionId",
      "correctTreatmentIds",
      "isCorrect",
      "isSkipped",
    ];
    const affectsScore =
      input.operation !== "update" ||
      !!input.scoring?.confirmed ||
      scoringFields.some(
        (k) =>
          JSON.stringify(data[k] ?? before?.[k]) !==
          JSON.stringify(before?.[k]),
      );
    if (parent && affectsScore) {
      answers = await db
        .collection("useranswers")
        .find({ attemptId }, { session })
        .sort({ _id: 1 })
        .toArray();
      const proposed = answers.filter(
        (a) => String(a._id) !== String(before?._id),
      );
      if (input.operation !== "delete") proposed.push({ ...before, ...data });
      const basis = input.scoring?.confirmed
        ? input.scoring
        : parent._professorScoring;
      if (!basis?.denominator || !basis.reference) requiresScoring = true;
      else scores = scoreAnswers(proposed, basis.denominator);
      affected.attempts = 1;
    } else if (!parent)
      warnings.push("Réponse orpheline : aucune tentative à recalculer.");
  }
  if (resource === "attempts" && data.scores) {
    const changed =
      !before ||
      !!input.scoring?.confirmed ||
      Object.entries(data.scores).some(([k, v]) => before.scores?.[k] !== v);
    if (changed) {
      const basis = input.scoring?.confirmed
        ? input.scoring
        : before?._professorScoring;
      if (!basis?.denominator || !basis.reference) requiresScoring = true;
      else {
        const total = Object.values(data.scores).reduce(
          (sum: number, v: any) => sum + Number(v),
          0,
        );
        if (total > basis.denominator)
          throw new ProfessorError("Score supérieur au dénominateur.");
        scores = {
          ...data.scores,
          total,
          percentage: Math.round((total / basis.denominator) * 100),
        };
        warnings.push(
          "Correction des scores enregistrés : les réponses individuelles ne seront pas réécrites.",
        );
      }
    }
    delete data.scores;
  }
  if (requiresScoring)
    warnings.push(
      "Base historique inconnue. Confirmez le dénominateur et sa référence avant de sauvegarder.",
    );
  const after =
    input.operation === "delete"
      ? null
      : { ...safe(before ?? {}), ...safe(data), ...(scores ? { scores } : {}) };
  const confirmation =
    resource === "accounts" ? (before?.email ?? "") : (input.id ?? "");
  const token = fingerprint({
    input: { ...input, previewToken: undefined, confirmation: undefined },
    before,
    parent,
    answers,
    affected,
  });
  return {
    before,
    data,
    parent,
    answers,
    scores,
    preview: {
      token,
      before: safe(before),
      after,
      affected,
      warnings,
      scores,
      requiresScoring,
      confirmation,
    },
  };
}
export async function previewMutation(
  ctx: Context,
  input: MutationInput,
): Promise<MutationPreview> {
  ctx.actor = await requireActor(ctx.db, ctx.actor.id);
  return (await prepare(ctx, input)).preview;
}
export async function mutateRecord(ctx: Context, input: MutationInput) {
  if (
    !input.reason ||
    input.reason.trim().length < 5 ||
    input.reason.length > 1000
  )
    throw new ProfessorError("Indiquez une raison (5 caractères minimum).");
  const session = ctx.client.startSession();
  let result: { id?: string; affected: Record<string, number> } = {
    affected: {},
  };
  try {
    await session.withTransaction(async () => {
      // Serializes privilege changes and deletions, preventing last-professor write skew.
      await ctx.db
        .collection<any>("professoraudit")
        .updateOne(
          { _id: "professor-access-lock" },
          { $inc: { revision: 1 }, $set: { kind: "lock" } },
          { session, upsert: true },
        );
      ctx.actor = await requireActor(ctx.db, ctx.actor.id, session);
      const p = await prepare(ctx, input, session);
      if (p.preview.requiresScoring)
        throw new ProfessorError(
          "Confirmez la base de calcul historique.",
          "SCORING_REQUIRED",
        );
      if (input.previewToken !== p.preview.token)
        throw new ProfessorError(
          "La prévisualisation a expiré. Vérifiez à nouveau les modifications.",
          "CONFLICT",
        );
      if (
        input.operation === "delete" &&
        input.confirmation !== p.preview.confirmation
      )
        throw new ProfessorError("La confirmation saisie ne correspond pas.");
      const collection = ctx.db.collection(collections[input.resource]);
      const now = new Date();
      const data = {
        ...p.data,
        updatedAt: now,
        _professorRevision: randomUUID(),
      };
      if (data.password) data.password = await bcrypt.hash(data.password, 12);
      if (p.scores) data.scores = p.scores;
      if (input.scoring?.confirmed) {
        if (!input.scoring.reference.trim())
          throw new ProfessorError("La référence historique est obligatoire.");
        data._professorScoring = {
          denominator: input.scoring.denominator,
          reference: input.scoring.reference,
          confirmed: true,
        };
      }
      let targetId = input.id;
      if (input.operation === "delete") {
        if (input.resource === "accounts") {
          const owned = await ctx.db
            .collection("quizattempts")
            .find(
              { userId: p.before!._id },
              { session, projection: { _id: 1 } },
            )
            .toArray();
          await ctx.db
            .collection("useranswers")
            .deleteMany(
              { attemptId: { $in: owned.map((a) => a._id) } },
              { session },
            );
          await ctx.db
            .collection("quizattempts")
            .deleteMany({ userId: p.before!._id }, { session });
          await ctx.db
            .collection("accounts")
            .deleteMany({ userId: p.before!._id }, { session });
        }
        if (input.resource === "attempts")
          await ctx.db
            .collection("useranswers")
            .deleteMany({ attemptId: p.before!._id }, { session });
        await collection.deleteOne({ _id: p.before!._id }, { session });
      } else if (input.operation === "create") {
        if (input.resource === "attempts")
          Object.assign(data, {
            scores: p.scores ?? {
              preTest: 0,
              phase1: 0,
              phase2: 0,
              phase3: 0,
              phase4: 0,
              postTest: 0,
              total: 0,
              percentage: 0,
            },
            combo: 0,
            maxCombo: 0,
            fastAnswers: 0,
            achievements: [],
            skippedCount: 0,
            timeSpentSeconds: 0,
          });
        const created = await collection.insertOne(
          { ...data, createdAt: now },
          { session },
        );
        targetId = String(created.insertedId);
      } else
        await collection.updateOne(
          { _id: p.before!._id },
          { $set: data },
          { session },
        );
      if (input.resource === "answers" && p.parent && p.scores) {
        await ctx.db
          .collection("quizattempts")
          .updateOne(
            { _id: p.parent._id },
            {
              $set: {
                scores: p.scores,
                updatedAt: now,
                _professorRevision: randomUUID(),
                ...(input.scoring?.confirmed
                  ? { _professorScoring: { ...input.scoring } }
                  : {}),
              },
            },
            { session },
          );
      }
      await ctx.db
        .collection("professoraudit")
        .insertOne(
          {
            kind: "event",
            action: `${input.resource}.${input.operation}`,
            actorId: ctx.actor.id,
            actorName: ctx.actor.name,
            targetId,
            reason: input.reason.trim(),
            before: safe(p.before),
            after:
              input.operation === "delete"
                ? null
                : safe({ ...p.before, ...data }),
            scoring: input.scoring?.confirmed ? input.scoring : null,
            affected: p.preview.affected,
            createdAt: now,
          },
          { session },
        );
      result = { id: targetId, affected: p.preview.affected };
    });
    return result;
  } finally {
    await session.endSession();
  }
}
