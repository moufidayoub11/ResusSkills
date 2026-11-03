import {currentProfessor} from "@/lib/professor/legacy-guard";
import { auth } from "@/lib/auth";
import { getQuizState } from "@/actions/quiz.actions";
import { redirect } from "next/navigation";
import { QuizGame } from "../../../../components/quiz/quiz-game";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz en Cours",
  description: "Répondez aux questions du quiz ResusSkills",
};

export default async function QuizAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { attemptId } = await params;
  const search = await searchParams;
  const allowProfessor = (search?.viewAs === "prof") || (search?.asProfessor === "1");
  if(allowProfessor && session.user?.id && await currentProfessor(session.user.id)) redirect(`/dashboard/attempts/${attemptId}`);
  const quizState = await getQuizState(attemptId, allowProfessor);

  if (!quizState.success || !("data" in quizState) || !quizState.data) {
    redirect("/quiz");
  }

  const { attempt, currentQuestion, progress, gamification, phaseReview } = quizState.data;

  const viewOnly = allowProfessor && session.user?.role === "professor";

  if (!currentQuestion && !phaseReview) {
    redirect(`/quiz/${attemptId}/review`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <QuizGame
        attemptId={attemptId}
        attempt={attempt}
        currentQuestion={currentQuestion}
        progress={progress}
        gamification={gamification}
        phaseReview={phaseReview}
        viewOnly={viewOnly}
      />
    </div>
  );
}
