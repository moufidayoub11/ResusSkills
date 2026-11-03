"use server";
import {currentProfessor} from "@/lib/professor/legacy-guard";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { QuizAttempt } from "@/models/quiz-attempt.model";
import { UserAnswer } from "@/models/user-answer.model";
import { User } from "@/models/user.model";
import { questionBank } from "../data/question-bank";
import treatmentOptionsData from "../data/treatment-options.json";
import { revalidatePath } from "next/cache";

// Start a new quiz attempt
type ActionSuccess<T> = { success: true; data: T };

export async function startQuiz() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    // Check for existing in-progress attempt
    const existingAttempt = await QuizAttempt.findOne({
      userId: session.user.id,
      status: "in-progress",
    });

    if (existingAttempt) {
      return { success: true, data: { id: existingAttempt._id.toString() } };
    }

    // Create new attempt
    const attempt = await QuizAttempt.create({
      userId: session.user.id,
      status: "in-progress",
      currentPhase: "preTest",
      currentQuestionIndex: 0,
    });

    return { success: true, data: { id: attempt._id.toString() } };
  } catch (error) {
    console.error("Start quiz error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Submit an answer
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string,
  timeSpent?: number // seconds spent on question
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: session.user.id,
      status: "in-progress",
    });

    if (!attempt) {
      return { success: false, error: "Tentative non trouvée" };
    }

    if (attempt.pendingReviewPhase) {
      return { success: false, error: "Cette phase est en cours de debriefing" };
    }

    // Find the question and correct answer
    const { question, correctOptionId, correctTreatmentIds, phase, type } = findQuestion(questionId);

    if (!question) {
      return { success: false, error: "Question non trouvée" };
    }

    let isCorrect = false;

    if (correctTreatmentIds) {
      const selectedTreatments = parseSelectedTreatmentIds(selectedOptionId);
      const selectedSet = new Set(selectedTreatments);
      const correctSet = new Set(correctTreatmentIds);

      isCorrect =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((item) => correctSet.has(item));
    } else {
      isCorrect = selectedOptionId === correctOptionId;
    }

    // Save answer
    const answerData: any = {
      attemptId,
      questionId,
      questionType: type,
      phase,
      selectedOptionId,
      isCorrect,
      answeredAt: new Date(),
      timeSpent: timeSpent || 0,
    };

    // Add correct answer data
    if (correctTreatmentIds) {
      answerData.correctTreatmentIds = correctTreatmentIds;
    } else {
      answerData.correctOptionId = correctOptionId;
    }

    await UserAnswer.findOneAndUpdate(
      { attemptId, questionId },
      answerData,
      { upsert: true }
    );

    // Calculate new combo and achievements
    let newCombo = 0;
    let newMaxCombo = attempt.maxCombo || 0;
    const isFastAnswer = timeSpent !== undefined && timeSpent <= 10;
    
    if (isCorrect) {
      newCombo = (attempt.combo || 0) + 1;
      newMaxCombo = Math.max(newMaxCombo, newCombo);
    }
    
    // Update scores and gamification data
    const updateData: any = {
      combo: newCombo,
      maxCombo: newMaxCombo,
    };
    
    if (isCorrect) {
      const scoreField = getScoreField(phase);
      updateData.$inc = { 
        [`scores.${scoreField}`]: 1, 
        "scores.total": 1,
      };
      if (isFastAnswer) {
        updateData.$inc.fastAnswers = 1;
      }
    }
    
    await QuizAttempt.findByIdAndUpdate(attemptId, updateData);

    return { 
      success: true, 
      data: { 
        isCorrect, 
        correctOptionId,
        combo: newCombo,
        maxCombo: newMaxCombo,
        isFastAnswer,
      } 
    };
  } catch (error) {
    console.error("Submit answer error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Skip a question (mark as skipped, move to next)
export async function skipQuestion(attemptId: string, questionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: session.user.id,
      status: "in-progress",
    });

    if (!attempt) {
      return { success: false, error: "Tentative non trouvée" };
    }

    if (attempt.pendingReviewPhase) {
      return { success: false, error: "Cette phase est en cours de debriefing" };
    }

    const { question, correctOptionId, correctTreatmentIds, phase, type } = findQuestion(questionId);

    if (!question) {
      return { success: false, error: "Question non trouvée" };
    }

    // Save as skipped (no answer selected, marked incorrect)
    const answerData: any = {
      attemptId,
      questionId,
      questionType: type,
      phase,
      selectedOptionId: null,
      isCorrect: false,
      isSkipped: true,
      answeredAt: new Date(),
    };

    // Add correct answer data
    if (correctTreatmentIds) {
      answerData.correctTreatmentIds = correctTreatmentIds;
    } else {
      answerData.correctOptionId = correctOptionId;
    }

    await UserAnswer.findOneAndUpdate(
      { attemptId, questionId },
      answerData,
      { upsert: true }
    );

    // Reset combo and increment skipped count
    await QuizAttempt.findByIdAndUpdate(attemptId, {
      combo: 0,
      $inc: { skippedCount: 1 },
    });

    if (isLastClinicalQuestion(attempt.currentPhase, attempt.currentQuestionIndex)) {
      await QuizAttempt.findByIdAndUpdate(attemptId, {
        pendingReviewPhase: attempt.currentPhase,
      });

      return { success: true, data: { phaseReview: true, phase: attempt.currentPhase } };
    }

    // Move to next question
    const { nextPhase, nextIndex, isComplete } = calculateNextPosition(
      attempt.currentPhase,
      attempt.currentQuestionIndex
    );

    if (isComplete) {
      const totalQuestions = getTotalQuestions();
      const percentage = Math.round((attempt.scores.total / totalQuestions) * 100);

      await QuizAttempt.findByIdAndUpdate(attemptId, {
        status: "completed",
        completedAt: new Date(),
        "scores.percentage": percentage,
      });

      return { success: true, data: { isComplete: true } };
    }

    await QuizAttempt.findByIdAndUpdate(attemptId, {
      currentPhase: nextPhase,
      currentQuestionIndex: nextIndex,
    });

    return { success: true, data: { nextPhase, nextIndex, isComplete: false } };
  } catch (error) {
    console.error("Skip question error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Complete quiz early (submit current progress)
export async function completeQuiz(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: session.user.id,
      status: "in-progress",
    });

    if (!attempt) {
      return { success: false, error: "Tentative non trouvée" };
    }

    if (attempt.pendingReviewPhase) {
      return { success: false, error: "Terminez le debriefing de phase avant de finaliser le quiz" };
    }

    const totalQuestions = getTotalQuestions();
    const percentage = Math.round((attempt.scores.total / totalQuestions) * 100);

    await QuizAttempt.findByIdAndUpdate(attemptId, {
      status: "completed",
      completedAt: new Date(),
      "scores.percentage": percentage,
    });

    revalidatePath("/quiz");
    return { success: true, data: { percentage } };
  } catch (error) {
    console.error("Complete quiz error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Move to next question or phase
export async function nextQuestion(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: session.user.id,
    });

    if (!attempt) {
      return { success: false, error: "Tentative non trouvée" };
    }

    if (attempt.pendingReviewPhase) {
      return { success: false, error: "Terminez le debriefing de phase avant de continuer" };
    }

    if (isLastClinicalQuestion(attempt.currentPhase, attempt.currentQuestionIndex)) {
      const currentQuestion = getCurrentQuestion(attempt.currentPhase, attempt.currentQuestionIndex);
      const currentAnswer = currentQuestion
        ? await UserAnswer.findOne({ attemptId, questionId: currentQuestion.id }).lean()
        : null;

      if (!currentAnswer) {
        return { success: false, error: "Répondez à ce cas avant le debriefing" };
      }

      await QuizAttempt.findByIdAndUpdate(attemptId, {
        pendingReviewPhase: attempt.currentPhase,
      });

      return { success: true, data: { phaseReview: true, phase: attempt.currentPhase } };
    }

    const { nextPhase, nextIndex, isComplete } = calculateNextPosition(
      attempt.currentPhase,
      attempt.currentQuestionIndex
    );

    if (isComplete) {
      // Calculate final percentage
      const totalQuestions = getTotalQuestions();
      const percentage = Math.round((attempt.scores.total / totalQuestions) * 100);

      await QuizAttempt.findByIdAndUpdate(attemptId, {
        status: "completed",
        completedAt: new Date(),
        "scores.percentage": percentage,
      });

      return { success: true, data: { isComplete: true } };
    }

    await QuizAttempt.findByIdAndUpdate(attemptId, {
      currentPhase: nextPhase,
      currentQuestionIndex: nextIndex,
    });

    return { success: true, data: { nextPhase, nextIndex, isComplete: false } };
  } catch (error) {
    console.error("Next question error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Continue after a clinical phase review interstitial
export async function continueAfterPhaseReview(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: session.user.id,
      status: "in-progress",
    });

    if (!attempt) {
      return { success: false, error: "Tentative non trouvée" };
    }

    if (!attempt.pendingReviewPhase) {
      return { success: false, error: "Aucun debriefing de phase en attente" };
    }

    const { nextPhase } = calculateNextPosition(
      attempt.pendingReviewPhase,
      getPhaseLength(attempt.pendingReviewPhase) - 1
    );

    await QuizAttempt.findByIdAndUpdate(attemptId, {
      currentPhase: nextPhase,
      currentQuestionIndex: 0,
      pendingReviewPhase: null,
    });

    revalidatePath(`/quiz/${attemptId}`);
    return { success: true, data: { nextPhase } };
  } catch (error) {
    console.error("Continue after phase review error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Go to previous question
export async function previousQuestion(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await connectDB();

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId: session.user.id,
    });

    if (!attempt) {
      return { success: false, error: "Tentative non trouvée" };
    }

    if (attempt.pendingReviewPhase) {
      return { success: false, error: "Vous ne pouvez plus modifier les réponses de cette phase" };
    }

    const { prevPhase, prevIndex, isAtStart } = calculatePreviousPosition(
      attempt.currentPhase,
      attempt.currentQuestionIndex
    );

    if (isAtStart) {
      return { success: false, error: "Vous êtes à la première question" };
    }

    await QuizAttempt.findByIdAndUpdate(attemptId, {
      currentPhase: prevPhase,
      currentQuestionIndex: prevIndex,
    });

    return { success: true, data: { prevPhase, prevIndex, isAtStart: false } };
  } catch (error) {
    console.error("Previous question error:", error);
    return { success: false, error: "Une erreur est survenue" };
  }
}

// Get current quiz state
export async function getQuizState(attemptId: string, allowProfessor: boolean = false) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  await connectDB();

  // Allow professors to view other users' attempts when explicitly allowed
  let attempt: any = null;
  if (allowProfessor && await currentProfessor(session.user.id)) {
    attempt = await QuizAttempt.findOne({ _id: attemptId }).lean();
  } else {
    attempt = await QuizAttempt.findOne({ _id: attemptId, userId: session.user.id }).lean();
  }

  if (!attempt) return { success: false, error: "Tentative non trouvée" };

  const currentQuestion = getCurrentQuestion(
    attempt.currentPhase,
    attempt.currentQuestionIndex
  );

  const answeredQuestions = await UserAnswer.countDocuments({ attemptId });
  const totalQuestions = getTotalQuestions();
  
  // Calculate phase-specific totals
  let phaseTotal = 0;
  let phaseName = "";
  
  if (attempt.currentPhase === "preTest") {
    phaseTotal = questionBank.preTest.length;
    phaseName = "Pré-Test";
  } else if (attempt.currentPhase === "postTest") {
    phaseTotal = questionBank.postTest.length;
    phaseName = "Post-Test";
  } else {
    const phaseData = questionBank.phases.find((p) => p.id === attempt.currentPhase);
    if (phaseData) {
      phaseTotal = phaseData.cases.length;
      phaseName = phaseData.name;
    }
  }

  // Attach user info to attempt (for professor view)
  const user = await User.findById(attempt.userId).lean();
  const phaseReview = attempt.pendingReviewPhase
    ? await getPhaseReviewData(attemptId, attempt.pendingReviewPhase)
    : null;

  return {
    success: true,
    data: {
      attempt: {
        ...attempt,
        _id: attempt._id.toString(),
        userId: attempt.userId.toString(),
        user: user
          ? {
              id: user._id.toString(),
              name: user.name,
              lastName: user.lastName,
              email: user.email,
              image: user.image,
            }
          : null,
      },
      currentQuestion,
      progress: {
        current: attempt.currentQuestionIndex + 1,
        total: phaseTotal,
        answered: answeredQuestions,
        percentage: Math.round((answeredQuestions / totalQuestions) * 100),
        phaseName: phaseName,
      },
      gamification: {
        combo: attempt.combo || 0,
        maxCombo: attempt.maxCombo || 0,
        fastAnswers: attempt.fastAnswers || 0,
        achievements: attempt.achievements || [],
        skippedCount: attempt.skippedCount || 0,
      },
      phaseReview,
    },
  } as ActionSuccess<any>;
}

// Get a user's latest attempt (professor-only)
export async function getLatestAttemptForUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  if (!(await currentProfessor(session.user.id))) {
    return { success: false, error: "Accès refusé" };
  }

  await connectDB();

  const attempt = await QuizAttempt.findOne({ userId }).sort({ createdAt: -1 }).lean();

  if (!attempt) return { success: false, error: "Aucune tentative trouvée" };

  const currentQuestion = getCurrentQuestion(
    attempt.currentPhase,
    attempt.currentQuestionIndex
  );

  const answeredQuestions = await UserAnswer.countDocuments({ attemptId: attempt._id.toString() });
  const totalQuestions = getTotalQuestions();

  // Calculate phase-specific totals
  let phaseTotal = 0;
  let phaseName = "";

  if (attempt.currentPhase === "preTest") {
    phaseTotal = questionBank.preTest.length;
    phaseName = "Pré-Test";
  } else if (attempt.currentPhase === "postTest") {
    phaseTotal = questionBank.postTest.length;
    phaseName = "Post-Test";
  } else {
    const phaseData = questionBank.phases.find((p) => p.id === attempt.currentPhase);
    if (phaseData) {
      phaseTotal = phaseData.cases.length;
      phaseName = phaseData.name;
    }
  }

  return {
    success: true,
    data: {
      attempt: {
        ...attempt,
        _id: attempt._id.toString(),
        userId: attempt.userId.toString(),
        startedAt: attempt.startedAt ? new Date(attempt.startedAt).toISOString() : null,
        completedAt: attempt.completedAt ? new Date(attempt.completedAt).toISOString() : null,
      },
      currentQuestion,
      progress: {
        current: attempt.currentQuestionIndex + 1,
        total: phaseTotal,
        answered: answeredQuestions,
        percentage: Math.round((answeredQuestions / totalQuestions) * 100),
        phaseName,
      },
      gamification: {
        combo: attempt.combo || 0,
        maxCombo: attempt.maxCombo || 0,
        fastAnswers: attempt.fastAnswers || 0,
        achievements: attempt.achievements || [],
        skippedCount: attempt.skippedCount || 0,
      },
    },
  } as ActionSuccess<any>;
}

// Get quiz attempt for review
export async function getQuizReview(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  await connectDB();

  // Allow professors to view any attempt for review
  let attempt: any = null;
  if (await currentProfessor(session.user.id)) {
    attempt = await QuizAttempt.findOne({ _id: attemptId }).lean();
  } else {
    attempt = await QuizAttempt.findOne({ _id: attemptId, userId: session.user.id }).lean();
  }

  if (!attempt) return { success: false, error: "Tentative non trouvée" };

  const userAnswers = await UserAnswer.find({ attemptId }).lean();

  // Build detailed answers with question text and explanations
  const answers = userAnswers.map((ans: any) => buildDetailedAnswer(ans));

  // Cast to any to handle timestamps that may not be in the interface
  const attemptData = attempt as any;

  return {
    success: true,
    data: {
      attempt: {
        _id: attemptData._id.toString(),
        userId: attemptData.userId.toString(),
        status: attemptData.status,
        currentPhase: attemptData.currentPhase,
        currentQuestionIndex: attemptData.currentQuestionIndex,
        pendingReviewPhase: attemptData.pendingReviewPhase || null,
        scores: attemptData.scores,
        startedAt: attemptData.startedAt ? new Date(attemptData.startedAt).toISOString() : null,
        completedAt: attemptData.completedAt ? new Date(attemptData.completedAt).toISOString() : null,
      },
      scores: attemptData.scores,
      status: attemptData.status,
      startedAt: attemptData.startedAt ? new Date(attemptData.startedAt).toISOString() : null,
      phases: questionBank.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        shockType: phase.shockType,
      })),
      answers,
    },
  };
}

// Get user's quiz history
export async function getQuizHistory() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", data: [] };
  }

  await connectDB();

  const attempts = await QuizAttempt.find({
    userId: session.user.id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const data = attempts.map((a) => ({
    ...a,
    _id: a._id.toString(),
    userId: a.userId.toString(),
  }));

  return { success: true, data };
}

// Get quiz history for a specific user (professor only)
export async function getQuizHistoryForUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", data: [] };
  }

  if (!(await currentProfessor(session.user.id))) {
    return { success: false, error: "Accès refusé", data: [] };
  }

  await connectDB();

  const attempts = await QuizAttempt.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const data = attempts.map((a: any) => ({
    ...a,
    _id: a._id.toString(),
    userId: a.userId.toString(),
    startedAt: a.startedAt ? new Date(a.startedAt).toISOString() : null,
    completedAt: a.completedAt ? new Date(a.completedAt).toISOString() : null,
  }));

  const user = await User.findById(userId).lean();

  return { success: true, data, user: user ? { id: user._id.toString(), name: user.name, lastName: user.lastName, email: user.email } : null };
}

// Helper functions
function resolveTreatmentOptions(treatmentIds: string[]) {
  const resolved: any[] = [];
  const treatmentMap = new Map<string, any>();

  // Build a map of all treatment options for quick lookup
  (treatmentOptionsData as any).categories.forEach((category: any) => {
    if (category.subcategories) {
      category.subcategories.forEach((subcategory: any) => {
        subcategory.options.forEach((option: any) => {
          treatmentMap.set(option.id, {
            id: option.id,
            text: option.text,
            categoryId: category.id,
            categoryName: category.name,
            subcategoryId: subcategory.id,
            subcategoryName: subcategory.name,
          });
        });
      });
    } else if (category.options) {
      category.options.forEach((option: any) => {
        treatmentMap.set(option.id, {
          id: option.id,
          text: option.text,
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId: null,
          subcategoryName: null,
        });
      });
    }
  });

  // Resolve the given treatment IDs
  treatmentIds.forEach((id) => {
    const resolved_option = treatmentMap.get(id);
    if (resolved_option) {
      resolved.push(resolved_option);
    }
  });

  return resolved;
}

function parseSelectedTreatmentIds(selectedOptionId: string | null | undefined): string[] {
  if (!selectedOptionId) return [];

  try {
    const parsed = JSON.parse(selectedOptionId);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.treatmentAnswers)) return parsed.treatmentAnswers;
  } catch {
    return [];
  }

  return [];
}

function buildDetailedAnswer(ans: any) {
  const { question, correctTreatmentIds } = findQuestion(ans.questionId);
  const questionObj = question as any;
  const selectedOption = questionObj?.options?.find((option: any) => option.id === ans.selectedOptionId);
  const correctOption = questionObj?.options?.find((option: any) => option.isCorrect);
  const selectedTreatments = correctTreatmentIds
    ? parseSelectedTreatmentIds(ans.selectedOptionId)
    : [];
  const phaseData = questionBank.phases.find((phase) => phase.id === ans.phase);

  return {
    questionId: ans.questionId,
    questionStem: questionObj?.stem || questionObj?.title || questionObj?.question || "Question non trouvée",
    caseTitle: questionObj?.title || null,
    patientName: questionObj?.patient?.name || null,
    selectedOptionId: ans.selectedOptionId,
    selectedOptionText: selectedOption?.text || (ans.isSkipped ? "Question passée" : "Non répondu"),
    correctOptionId: ans.correctOptionId,
    correctOptionText: correctOption?.text || "",
    isCorrect: ans.isCorrect,
    isSkipped: ans.isSkipped || false,
    phase: ans.phase,
    phaseName: ans.phase === "preTest" ? "Pré-Test" : ans.phase === "postTest" ? "Post-Test" : phaseData?.name || ans.phase,
    explanation: correctOption?.explanation || null,
    options: questionObj?.options?.map((option: any) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
      explanation: option.explanation || null,
    })) || [],
    hasTreatmentQuestion: !!correctTreatmentIds,
    correctTreatmentIds: correctTreatmentIds || [],
    selectedTreatmentIds: selectedTreatments,
    correctTreatmentsResolved: resolveTreatmentOptions(correctTreatmentIds || []),
    selectedTreatmentsResolved: resolveTreatmentOptions(selectedTreatments),
  };
}

async function getPhaseReviewData(attemptId: string, phaseId: string) {
  const phase = questionBank.phases.find((item) => item.id === phaseId);
  if (!phase) return null;

  const userAnswers = await UserAnswer.find({ attemptId, phase: phaseId }).lean();
  const answerByQuestionId = new Map(userAnswers.map((answer: any) => [answer.questionId, answer]));
  const answers = phase.cases
    .map((clinicalCase) => answerByQuestionId.get(clinicalCase.id))
    .filter(Boolean)
    .map((answer) => buildDetailedAnswer(answer));

  return {
    phaseId: phase.id,
    phaseName: phase.name,
    shockType: phase.shockType,
    answers,
  };
}

function findQuestion(questionId: string) {
  // Check preTest
  const preQuestion = questionBank.preTest.find((q) => q.id === questionId);
  if (preQuestion) {
    const correct = preQuestion.options.find((o) => o.isCorrect);
    return {
      question: preQuestion,
      correctOptionId: correct?.id || "",
      correctTreatmentIds: undefined,
      phase: "preTest",
      type: "mcq" as const,
    };
  }

  // Check phases
  for (const phase of questionBank.phases) {
    const caseQuestion = phase.cases.find((c) => c.id === questionId);
    if (caseQuestion) {
      return {
        question: caseQuestion,
        correctOptionId: "",
        correctTreatmentIds: caseQuestion.priseEnChargeCorrectIds,
        phase: phase.id,
        type: "clinical-case" as const,
      };
    }
  }

  // Check postTest
  const postQuestion = questionBank.postTest.find((q) => q.id === questionId);
  if (postQuestion) {
    const correct = postQuestion.options.find((o) => o.isCorrect);
    return {
      question: postQuestion,
      correctOptionId: correct?.id || "",
      correctTreatmentIds: undefined,
      phase: "postTest",
      type: "mcq" as const,
    };
  }

  return { question: null, correctOptionId: "", correctTreatmentIds: undefined, phase: "", type: "mcq" as const };
}

function getScoreField(phase: string): string {
  if (phase === "preTest" || phase === "postTest") return phase;

  const phaseIndex = questionBank.phases.findIndex((item) => item.id === phase);
  return phaseIndex >= 0 ? `phase${phaseIndex + 1}` : "total";
}

function getPhaseOrder() {
  return ["preTest", ...questionBank.phases.map((phase) => phase.id), "postTest"];
}

function getPhaseLength(phase: string) {
  if (phase === "preTest") return questionBank.preTest.length;
  if (phase === "postTest") return questionBank.postTest.length;

  return questionBank.phases.find((item) => item.id === phase)?.cases.length || 0;
}

function isClinicalPhase(phase: string) {
  return questionBank.phases.some((item) => item.id === phase);
}

function isLastClinicalQuestion(phase: string, index: number) {
  return isClinicalPhase(phase) && index === getPhaseLength(phase) - 1;
}

function calculateNextPosition(currentPhase: string, currentIndex: number) {
  const phases = getPhaseOrder();
  const currentLength = getPhaseLength(currentPhase);

  if (currentIndex + 1 < currentLength) {
    return { nextPhase: currentPhase, nextIndex: currentIndex + 1, isComplete: false };
  }

  const currentPhaseIndex = phases.indexOf(currentPhase);
  if (currentPhaseIndex + 1 < phases.length) {
    return { nextPhase: phases[currentPhaseIndex + 1], nextIndex: 0, isComplete: false };
  }

  return { nextPhase: currentPhase, nextIndex: currentIndex, isComplete: true };
}

function calculatePreviousPosition(currentPhase: string, currentIndex: number) {
  const phases = getPhaseOrder();

  // If not at the start of current phase, go to previous question in same phase
  if (currentIndex > 0) {
    return { prevPhase: currentPhase, prevIndex: currentIndex - 1, isAtStart: false };
  }

  // If at start of current phase, go to last question of previous phase
  const currentPhaseIndex = phases.indexOf(currentPhase);
  if (currentPhaseIndex > 0) {
    const prevPhase = phases[currentPhaseIndex - 1];
    const prevLength = getPhaseLength(prevPhase);
    return { prevPhase: prevPhase, prevIndex: prevLength - 1, isAtStart: false };
  }

  // At start of first phase
  return { prevPhase: currentPhase, prevIndex: currentIndex, isAtStart: true };
}

function getCurrentQuestion(phase: string, index: number) {
  if (phase === "preTest") {
    return { ...questionBank.preTest[index], phase: "preTest" };
  }
  if (phase === "postTest") {
    return { ...questionBank.postTest[index], phase: "postTest" };
  }

  const phaseData = questionBank.phases.find((p) => p.id === phase);
  if (phaseData) {
    return { ...phaseData.cases[index], phase: phase };
  }

  return null;
}

function getTotalQuestions(): number {
  return (
    questionBank.preTest.length +
    questionBank.phases.reduce((sum, p) => sum + p.cases.length, 0) +
    questionBank.postTest.length
  );
}

