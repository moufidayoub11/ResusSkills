import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { unzipSync, strFromU8 } from "fflate";
import { parseQuery, dateRange } from "@/lib/professor/query";
import {
  descriptive,
  histogram,
  prePostFigures,
  timingFigures,
  scoreFigures,
  progressionFigures,
} from "@/lib/professor/analytics";
import { csv, datasetExport } from "@/lib/professor/export";
import { applyProfessorIndexes } from "@/lib/professor/indexes";
import {
  dto,
  requireActor,
  listRecords,
  loadStudy,
  previewMutation,
  mutateRecord,
  scoreAnswers,
} from "@/lib/professor/service";
import type { Actor, MutationInput } from "@/lib/professor/types";
let replica: MongoMemoryReplSet, client: MongoClient, db: Db, actor: Actor;
const professor = new ObjectId(),
  student = new ObjectId(),
  attempt = new ObjectId(),
  answer = new ObjectId();
const scores = {
  preTest: 1,
  phase1: 0,
  phase2: 0,
  phase3: 0,
  phase4: 0,
  postTest: 0,
  total: 1,
  percentage: 50,
};
const accountData = {
  name: "Élève",
  lastName: "Fixture",
  email: "fixture@example.invalid",
  role: "student",
  age: 22,
};
const context = () => ({ client, db, actor });
async function save(input: MutationInput) {
  const preview = await previewMutation(context(), input);
  return mutateRecord(context(), {
    ...input,
    previewToken: preview.token,
    confirmation: preview.confirmation,
  });
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = await new MongoClient(replica.getUri()).connect();
  db = client.db("resusskills_test");
  await applyProfessorIndexes(db);
});
afterAll(async () => {
  await client?.close();
  await replica?.stop();
});
beforeEach(async () => {
  for (const name of [
    "users",
    "quizattempts",
    "useranswers",
    "accounts",
    "professoraudit",
  ])
    await db.collection(name).deleteMany({});
  await db.collection("users").insertMany([
    {
      _id: professor,
      name: "Professeur",
      lastName: "Fixture",
      email: "prof@example.invalid",
      role: "professor",
      password: "HASH_SECRET",
    },
    {
      _id: student,
      ...accountData,
      password: "HASH_SECRET",
      createdAt: new Date("2024-01-01"),
    },
  ]);
  await db
    .collection("quizattempts")
    .insertOne({
      _id: attempt,
      userId: student,
      status: "completed",
      startedAt: new Date("2024-06-01"),
      completedAt: new Date("2024-06-01T01:00:00Z"),
      scores,
      currentPhase: "postTest",
    });
  await db
    .collection("useranswers")
    .insertOne({
      _id: answer,
      attemptId: attempt,
      questionId: "missing-historical-item",
      questionType: "mcq",
      phase: "preTest",
      selectedOptionId: "a",
      correctOptionId: "a",
      isCorrect: true,
      isSkipped: false,
      timeSpent: 0,
      answeredAt: new Date("2024-06-01"),
    });
  actor = await requireActor(db, String(professor));
});
describe("descriptive research calculations", () => {
  it("includes zero and perfect scores; excludes out-of-range histogram values", () => {
    expect(histogram([0, 20, 99, 100, -1, 101], 5).counts).toEqual([
      1, 1, 0, 0, 2,
    ]);
    expect(descriptive([0, 50, 100])).toMatchObject({
      mean: 50,
      median: 50,
      q1: 25,
      q3: 75,
      sd: 50,
    });
    expect(descriptive([]).mean).toBeNull();
  });
  it("does not infer a denominator from response count", () => {
    expect(() =>
      scoreAnswers([{ phase: "preTest", isCorrect: true }], 0),
    ).toThrow();
    expect(
      scoreAnswers([{ phase: "preTest", isCorrect: true }], 34).percentage,
    ).toBe(3);
  });
  it("uses first eligible completed attempt per student and retains missing timings", async () => {
    await db.collection("quizattempts").insertMany([
      {
        userId: student,
        status: "completed",
        startedAt: new Date("2024-07-01"),
        scores: { ...scores, percentage: 100 },
      },
      {
        userId: student,
        status: "in-progress",
        startedAt: new Date("2024-08-01"),
        scores,
      },
    ]);
    const s = await loadStudy(db, parseQuery({}, true));
    expect(s.attempts).toHaveLength(1);
    expect(s.allAttempts).toHaveLength(3);
    expect(timingFigures(s)[0].n).toBe(0);
    expect(prePostFigures(s)[0].n).toBe(0);
    expect(scoreFigures(s)[0].n).toBe(1);
    expect(progressionFigures(s)[0].n).toBe(1);
    expect(
      (await loadStudy(db, parseQuery({ selection: "latest" }, true)))
        .attempts[0].scores.percentage,
    ).toBe(100);
  });
  it("compares pre/post with observed unequal denominators", async () => {
    await db.collection("useranswers").insertMany([
      {
        attemptId: attempt,
        questionId: "post-1",
        phase: "postTest",
        isCorrect: true,
      },
      {
        attemptId: attempt,
        questionId: "post-2",
        phase: "postTest",
        isCorrect: false,
      },
    ]);
    const f = prePostFigures(await loadStudy(db, parseQuery({}, true)))[0];
    expect(f.rows[0].slice(1, 6)).toEqual([100, 50, -50, 1, 2]);
  });
  it("uses timezone-aware end-exclusive range boundaries", () => {
    const range = dateRange({ from: "2024-07-01", to: "2024-07-01" })!;
    expect(range.$gte.toISOString()).toBe("2024-06-30T23:00:00.000Z");
    expect(range.$lt.toISOString()).toBe("2024-07-01T23:00:00.000Z");
  });
});
describe("guarded transactional CRUD", () => {
  it("denies student and demoted sessions", async () => {
    await expect(requireActor(db, String(student))).rejects.toThrow(
      "droits professeur",
    );
    await db
      .collection("users")
      .updateOne({ _id: professor }, { $set: { role: "student" } });
    await expect(
      previewMutation(context(), {
        resource: "accounts",
        operation: "create",
        data: {
          ...accountData,
          email: "new@example.invalid",
          password: "long-password-12",
        },
        reason: "Test fixture",
      }),
    ).rejects.toThrow();
  });
  it("paginates all users including users with no attempts", async () => {
    await db
      .collection("users")
      .insertMany(
        Array.from({ length: 60 }, (_, i) => ({
          ...accountData,
          email: `user${i}@example.invalid`,
          name: "Same",
          createdAt: new Date("2024-01-01"),
        })),
      );
    const first = await listRecords(
        db,
        "accounts",
        parseQuery({ page: "1", sort: "name", direction: "asc" }),
      ),
      second = await listRecords(
        db,
        "accounts",
        parseQuery({ page: "2", sort: "name", direction: "asc" }),
      );
    expect(first.total).toBe(62);
    expect(second.items).toHaveLength(25);
    expect(
      new Set([...first.items, ...second.items].map((r) => r.id)).size,
    ).toBe(50);
    expect(first.items.some((r) => r.attemptCount === 0)).toBe(true);
    expect(JSON.stringify(first)).not.toContain("HASH_SECRET");
  });
  it("creates and updates accounts with safe audit and optimistic conflict", async () => {
    const result = await save({
      resource: "accounts",
      operation: "create",
      data: {
        ...accountData,
        email: "new@example.invalid",
        password: "new-password-strong",
      },
      reason: "Créer la fixture",
    });
    const record = dto(
      await db.collection("users").findOne({ _id: new ObjectId(result.id) }),
    );
    const input: MutationInput = {
      resource: "accounts",
      operation: "update",
      id: record.id,
      revision: record.revision,
      data: { ...accountData, email: "new@example.invalid", name: "Nouveau" },
      reason: "Corriger prénom",
    };
    await save(input);
    await expect(previewMutation(context(), input)).rejects.toThrow("changé");
    const audit = JSON.stringify(
      await db.collection("professoraudit").find({ kind: "event" }).toArray(),
    );
    expect(audit).not.toContain("password");
    expect(audit).not.toContain("new-password-strong");
  });
  it("blocks self-deletion and self-demotion", async () => {
    const row = dto(await db.collection("users").findOne({ _id: professor }));
    await expect(
      previewMutation(context(), {
        resource: "accounts",
        operation: "delete",
        id: row.id,
        revision: row.revision,
        data: {},
        reason: "Self deletion",
      }),
    ).rejects.toThrow("propre compte");
    await expect(
      previewMutation(context(), {
        resource: "accounts",
        operation: "update",
        id: row.id,
        revision: row.revision,
        data: {
          ...accountData,
          email: "prof@example.invalid",
          role: "student",
        },
        reason: "Self demotion",
      }),
    ).rejects.toThrow("propre compte");
  });
  it("requires explicit historical scoring and atomically corrects parent score", async () => {
    const row = dto(
      await db.collection("useranswers").findOne({ _id: answer }),
    );
    const input: MutationInput = {
      resource: "answers",
      operation: "update",
      id: row.id,
      revision: row.revision,
      reason: "Correction historique vérifiée",
      data: {
        attemptId: String(attempt),
        questionId: row.questionId,
        questionType: "mcq",
        phase: "preTest",
        selectedOptionId: "b",
        correctOptionId: "a",
        isCorrect: true,
        isSkipped: false,
        timeSpent: 0,
        answeredAt: "2024-06-01T00:00:00Z",
      },
    };
    expect((await previewMutation(context(), input)).requiresScoring).toBe(
      true,
    );
    await expect(save(input)).rejects.toThrow("historique");
    expect(
      (await db.collection("quizattempts").findOne({ _id: attempt }))!.scores
        .percentage,
    ).toBe(50);
    await save({
      ...input,
      scoring: {
        denominator: 34,
        reference: "Archive vérifiée de 34 items",
        confirmed: true,
      },
    });
    expect(
      (await db.collection("quizattempts").findOne({ _id: attempt }))!.scores
        .percentage,
    ).toBe(0);
    expect(
      (await db.collection("useranswers").findOne({ _id: answer }))!.isCorrect,
    ).toBe(false);
  });
  it("rejects duplicate answers and wrong typed deletion without partial writes", async () => {
    await expect(
      previewMutation(context(), {
        resource: "answers",
        operation: "create",
        data: {
          attemptId: String(attempt),
          questionId: "missing-historical-item",
          questionType: "mcq",
          phase: "preTest",
          selectedOptionId: "a",
          isCorrect: true,
          isSkipped: false,
          answeredAt: "2024-06-01T00:00:00Z",
          correctOptionId: "a",
        },
        reason: "Duplicate test",
      }),
    ).rejects.toThrow("déjà");
    const row = dto(await db.collection("users").findOne({ _id: student }));
    const input: MutationInput = {
      resource: "accounts",
      operation: "delete",
      id: row.id,
      revision: row.revision,
      data: {},
      reason: "Cascade fixture",
    };
    const preview = await previewMutation(context(), input);
    expect(preview.affected).toMatchObject({
      accounts: 1,
      attempts: 1,
      answers: 1,
    });
    await expect(
      mutateRecord(context(), {
        ...input,
        previewToken: preview.token,
        confirmation: "wrong",
      }),
    ).rejects.toThrow("confirmation");
    expect(await db.collection("useranswers").countDocuments()).toBe(1);
    await save(input);
    expect(await db.collection("useranswers").countDocuments()).toBe(0);
    expect(await db.collection("quizattempts").countDocuments()).toBe(0);
  });
  it("invalidates an answer preview if its parent changes", async () => {
    const row = dto(
      await db.collection("useranswers").findOne({ _id: answer }),
    );
    const input: MutationInput = {
      resource: "answers",
      operation: "delete",
      id: row.id,
      revision: row.revision,
      data: {},
      reason: "Delete fixture",
      scoring: {
        denominator: 34,
        reference: "Verified fixture",
        confirmed: true,
      },
    };
    const p = await previewMutation(context(), input);
    await db
      .collection("quizattempts")
      .updateOne({ _id: attempt }, { $set: { "scores.percentage": 75 } });
    await expect(
      mutateRecord(context(), {
        ...input,
        previewToken: p.token,
        confirmation: row.id,
      }),
    ).rejects.toThrow("expiré");
    expect(await db.collection("useranswers").countDocuments()).toBe(1);
  });
});
describe("dataset formatting and privacy", () => {
  it("includes explicitly null timing in the unavailable-duration filter", async () => {
    await db.collection("useranswers").updateOne({_id:answer},{$set:{timeSpent:null}});
    const result=await listRecords(db,"answers",parseQuery({availability:"untimed"}));
    expect(result.total).toBe(1);
  });
  it("does not rescore a historical attempt when only timing changes", async () => {
    const row=dto(await db.collection("useranswers").findOne({_id:answer}));
    const input:MutationInput={resource:"answers",operation:"update",id:row.id,revision:row.revision,reason:"Corriger la durée mesurée",data:{attemptId:String(attempt),questionId:row.questionId,questionType:"mcq",phase:"preTest",selectedOptionId:"a",correctOptionId:"a",isCorrect:true,isSkipped:false,timeSpent:42,answeredAt:"2024-06-01T00:00:00Z"}};
    expect((await previewMutation(context(),input)).requiresScoring).toBe(false);
    await save(input);
    expect((await db.collection("quizattempts").findOne({_id:attempt}))!.scores).toEqual(scores);
    expect((await db.collection("useranswers").findOne({_id:answer}))!.timeSpent).toBe(42);
  });
  it("reports no paired participants when there is no post-test", async () => {
    const figures=prePostFigures(await loadStudy(db,parseQuery({},true)));
    for(const figure of figures){expect(figure.n).toBe(0);expect(figure.participants).toBe(0);}
  });
  it("preserves accents, numbers, missing values, escaping and formula protection", () => {
    const text = csv(
      ["nom", "valeur"],
      [
        ['Élève, "test"', 12.5],
        ["=SUM(A1)", null],
        ["@cmd", 0],
      ],
    );
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('"Élève, ""test""",12.5');
    expect(text).toContain('"\'=SUM(A1)",');
    expect(text).toContain('"\'@cmd",0');
  });
  it("exports consistent pseudonyms without identity filters or passwords", async () => {
    const result = await datasetExport(
      db,
      actor,
      parseQuery({ students: String(student), selection: "all" }),
      false,
    );
    const files = unzipSync(result.bytes),
      all = Object.values(files)
        .map((value) => strFromU8(value))
        .join("");
    expect(all).not.toContain("fixture@example.invalid");
    expect(all).not.toContain(String(student));
    expect(all).not.toContain("HASH_SECRET");
    const accounts = strFromU8(files["comptes.csv"]),
      attempts = strFromU8(files["tentatives.csv"]);
    const pseudo = accounts.match(/P_[a-f0-9]{16}/)![0];
    expect(attempts).toContain(pseudo);
    expect(JSON.parse(strFromU8(files["manifest.json"])).counts).toEqual({
      accounts: 1,
      attempts: 1,
      answers: 1,
    });
  });
});
