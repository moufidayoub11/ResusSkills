"use server";
import {currentProfessor} from "@/lib/professor/legacy-guard";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { QuizAttempt } from "@/models/quiz-attempt.model";
import { User } from "@/models/user.model";
import { questionBank } from "@/data/question-bank";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id || !(await currentProfessor(session.user.id))) {
    return null;
  }

  await connectDB();

  const [totalStudents, totalAttempts, completedAttempts, avgScoreResult] =
    await Promise.all([
      User.countDocuments({ role: "student" }),
      QuizAttempt.countDocuments(),
      QuizAttempt.countDocuments({ status: "completed" }),
      QuizAttempt.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, avgScore: { $avg: "$scores.percentage" } } },
      ]),
    ]);

  const avgScore = avgScoreResult[0]?.avgScore || 0;

  return {
    totalStudents,
    totalAttempts,
    completedAttempts,
    avgScore: Math.round(avgScore),
    completionRate:
      totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0,
  };
}

export async function getScoreDistribution() {
  const session = await auth();
  if (!session?.user?.id || !(await currentProfessor(session.user.id))) {
    return [];
  }

  await connectDB();

  const distribution = await QuizAttempt.aggregate([
    { $match: { status: "completed" } },
    {
      $bucket: {
        groupBy: "$scores.percentage",
        boundaries: [0, 20, 40, 60, 80, 100, 101],
        default: "Other",
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  const labels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
  return labels.map((label, index) => ({
    range: label,
    count: distribution.find((d) => d._id === index * 20)?.count || 0,
  }));
}

export async function getStudentResults(page: number = 1, pageSize: number = 10) {
  const session = await auth();
  if (!session?.user?.id || !(await currentProfessor(session.user.id))) {
    return { results: [], total: 0, pages: 0 };
  }

  await connectDB();

  const skip = (page - 1) * pageSize;

  // Aggregate by user to avoid duplicates - get best and latest scores per user
  const [results, totalUsers] = await Promise.all([
    QuizAttempt.aggregate([
      { $match: { status: "completed" } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      // Sort by completedAt descending to get latest first
      { $sort: { completedAt: -1 } },
      // Group by user to aggregate their attempts
      {
        $group: {
          _id: "$userId",
          user: { $first: "$user" },
          attemptCount: { $sum: 1 },
          bestScore: { $max: "$scores.percentage" },
          latestScore: { $first: "$scores.percentage" },
          latestCompletedAt: { $first: "$completedAt" },
        },
      },
      { $sort: { latestCompletedAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ]),
    QuizAttempt.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$userId" } },
      { $count: "total" },
    ]),
  ]);

  const total = totalUsers[0]?.total || 0;

  return {
    results: results.map((r) => ({
      id: r._id.toString(),
      name: r.user.name,
      lastName: r.user.lastName,
      email: r.user.email,
      role: r.user.role,
      attemptCount: r.attemptCount,
      bestScore: r.bestScore || 0,
      latestScore: r.latestScore || 0,
      completedAt: r.latestCompletedAt,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export async function getPhasePerformance() {
  const session = await auth();
  if (!session?.user?.id || !(await currentProfessor(session.user.id))) {
    return [];
  }

  await connectDB();

  const performance = await QuizAttempt.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: null,
        avgPreTest: { $avg: "$scores.preTest" },
        avgPhase1: { $avg: "$scores.phase1" },
        avgPhase2: { $avg: "$scores.phase2" },
        avgPhase3: { $avg: "$scores.phase3" },
        avgPhase4: { $avg: "$scores.phase4" },
        avgPostTest: { $avg: "$scores.postTest" },
      },
    },
  ]);

  if (!performance.length) return [];

  const data = performance[0];
  return [
    { phase: "Pré-Test", avgScore: Math.round((data.avgPreTest / questionBank.preTest.length) * 100) },
    ...questionBank.phases.map((phase, index) => ({
      phase: phase.name.replace(/^Phase \d+ - /, ""),
      avgScore: Math.round((data[`avgPhase${index + 1}`] / phase.cases.length) * 100),
    })),
    { phase: "Post-Test", avgScore: Math.round((data.avgPostTest / questionBank.postTest.length) * 100) },
  ];
}
