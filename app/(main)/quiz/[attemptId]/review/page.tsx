import {currentProfessor} from "@/lib/professor/legacy-guard";
import { auth } from "@/lib/auth";
import { getQuizReview } from "@/actions/quiz.actions";
import { redirect } from "next/navigation";
import { QuizReview } from "@/components/quiz/quiz-review";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Résultats du Quiz",
  description: "Visualisez vos résultats et la revue du quiz sur ResusSkills",
};

export default async function QuizReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { attemptId } = await params;
  if(session.user?.id && await currentProfessor(session.user.id)) redirect(`/dashboard/attempts/${attemptId}`);
  const reviewData = await getQuizReview(attemptId);

  if (!reviewData.success || !reviewData.data) {
    redirect("/quiz");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <QuizReview attempt={reviewData.data} />
    </div>
  );
}
