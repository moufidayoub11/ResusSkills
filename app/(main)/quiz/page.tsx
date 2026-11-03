import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {currentProfessor} from "@/lib/professor/legacy-guard";
import { auth } from "@/lib/auth";
import { getQuizHistory, getQuizHistoryForUser } from "@/actions/quiz.actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, Trophy, BookOpen, Eye, Play } from "lucide-react";
import { QuizStartButton } from "@/components/quiz/quiz-start-button";
import { Metadata } from "next";
import { questionBank } from "@/data/question-bank";

export const metadata: Metadata = {
  title: "Quiz",
  description: "Commencez ou continuez votre quiz sur les chocs médicaux",
};

export default async function QuizPage(props: { searchParams?: Promise<{ viewOnly?: string; studentId?: string }> }) {
  const { searchParams: searchParamsPromise } = props;
  const searchParams = searchParamsPromise ? await searchParamsPromise : undefined;

  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isViewOnly = !!(searchParams && (searchParams.viewOnly === "1" || searchParams.viewOnly === "true"));

  let attempts: any[] = [];
  let inProgressQuiz: any = undefined;
  let viewedStudentName: string | null = null;

  if (isViewOnly) {
    const studentId = searchParams?.studentId;
    if (!studentId) {
      return <div className="p-8">Erreur: studentId requis</div>;
    }

    if (session.user?.role !== "professor") {
      redirect("/quiz");
    }

    if(await currentProfessor(session.user.id!)) redirect(`/dashboard/accounts/${studentId}`);
    const historyRes = await getQuizHistoryForUser(studentId);
    if (!historyRes.success) {
      return <div className="p-8">Erreur: {historyRes.error || "Aucune tentative"}</div>;
    }

    attempts = historyRes.data || [];
    viewedStudentName = historyRes.user ? `${historyRes.user.name || ""} ${historyRes.user.lastName || ""}`.trim() : null;
    inProgressQuiz = attempts.find((q) => q.status === "in-progress");
  } else {
    const quizHistory = await getQuizHistory();
    attempts = quizHistory.success ? quizHistory.data : [];
    inProgressQuiz = attempts.find((q) => q.status === "in-progress");
  }

  const quizStats = {
    totalAttempts: attempts.length,
    completedAttempts: attempts.filter((q) => q.status === "completed").length,
    averageScore: attempts.length
      ? Math.round(
          (attempts
            .filter((q) => q.status === "completed")
            .reduce((sum, q) => sum + (q.scores?.total || 0), 0) || 0) /
            (attempts.filter((q) => q.status === "completed").length || 1)
        )
      : 0,
  };

  const phaseRows = questionBank.phases.map((phase, index) => ({
    label: phase.name,
    scoreField: `phase${index + 1}`,
    count: phase.cases.length,
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">
          {isViewOnly ? `Vue étudiant${viewedStudentName ? ` — ${viewedStudentName}` : ""}` : "Bienvenue au Quiz ResusSkills"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {isViewOnly ? "Consultez l'historique de l'étudiant et ses tentatives" : "Testez vos connaissances sur les différents types de chocs médicaux"}
        </p>
      </div>

      {/* Quiz Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tentatives Totales</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizStats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">quiz commencés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Complétés</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizStats.completedAttempts}</div>
            <p className="text-xs text-muted-foreground">quiz terminés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizStats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">score moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Action Section */}
      {!isViewOnly && (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Commencer le Quiz</CardTitle>
            <CardDescription>
              Complétez le pré-test, les phases par type de choc, et le post-test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Structure du Quiz</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Pré-test: {questionBank.preTest.length} questions</li>
                  {phaseRows.map((phase) => (
                    <li key={phase.scoreField}>✓ {phase.label}: {phase.count} cas cliniques</li>
                  ))}
                  <li>✓ Post-test: {questionBank.postTest.length} questions</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Types de Chocs</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {questionBank.phases.map((phase) => (
                    <li key={phase.id}>✓ {phase.shockType}</li>
                  ))}
                </ul>
              </div>
            </div>
            <QuizStartButton inProgressAttemptId={inProgressQuiz?._id} />
          </CardContent>
        </Card>
        </div>
      )}

      {/* History Section */}
      {attempts.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Quiz</CardTitle>
              <CardDescription>Vos tentatives précédentes avec détail des scores</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Pré-Test</TableHead>
                    {phaseRows.map((phase) => (
                      <TableHead key={phase.scoreField} className="text-center">
                        {phase.label.replace(/^Phase \d+ - /, "")}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Post-Test</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt._id}>
                      <TableCell className="font-medium">
                        {new Date(attempt.startedAt!).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={attempt.status === "completed" ? "default" : "secondary"}>
                          {attempt.status === "completed" ? "Terminé" : "En cours"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{attempt.scores?.preTest ?? "-"}</TableCell>
                      {phaseRows.map((phase) => (
                        <TableCell key={phase.scoreField} className="text-center">
                          {attempt.scores?.[phase.scoreField] ?? "-"}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">{attempt.scores?.postTest ?? "-"}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {attempt.scores?.percentage !== undefined
                          ? `${attempt.scores.percentage}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {attempt.status === "completed" ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/quiz/${attempt._id}/review`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Revoir
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" asChild>
                            <Link href={`/quiz/${attempt._id}`}>
                              <Play className="mr-2 h-4 w-4" />
                              Continuer
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
