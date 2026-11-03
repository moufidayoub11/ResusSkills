import type { Db } from "mongodb";
// Explicit deployment operation only. Never invoked by page loads or migrations.
export async function applyProfessorIndexes(db: Db) {
  await db.collection("users").createIndexes([
    { key: { email: 1 }, unique: true, name: "email_1" },
    {
      key: { role: 1, createdAt: -1, _id: 1 },
      name: "professor_accounts_role_date",
    },
  ]);
  await db.collection("quizattempts").createIndexes([
    {
      key: { userId: 1, startedAt: 1, _id: 1 },
      name: "professor_attempt_owner_start",
    },
    {
      key: { status: 1, startedAt: -1, _id: 1 },
      name: "professor_attempt_status_start",
    },
  ]);
  await db.collection("useranswers").createIndexes([
    {
      key: { attemptId: 1, questionId: 1 },
      unique: true,
      name: "attemptId_1_questionId_1",
    },
    {
      key: { phase: 1, questionId: 1, answeredAt: -1, _id: 1 },
      name: "professor_answer_phase_question",
    },
    { key: { answeredAt: -1, _id: 1 }, name: "professor_answer_date" },
  ]);
  await db
    .collection("professoraudit")
    .createIndex(
      { kind: 1, createdAt: -1, _id: 1 },
      { name: "professor_audit_date" },
    );
}
