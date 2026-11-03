"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { CheckCircle2, XCircle, Trophy, ArrowLeft, BookOpen } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TreatmentAnswersDisplay } from "./treatment-answers-display";
import { PhaseMiniReview } from "./phase-mini-review";

interface QuizReviewProps {
  attempt: any;
}

export function QuizReview({ attempt }: QuizReviewProps) {
  const answers = attempt.answers || [];
  const phases = attempt.phases || [];
  const isCompleted = attempt.status === "completed";

  // Get total questions per section
  const totalQuestions = {
    preTest: answers.filter((a: any) => a.phase === "preTest").length,
    postTest: answers.filter((a: any) => a.phase === "postTest").length,
  };

  // Get correct answers per section
  const correctAnswers = {
    preTest: answers.filter((a: any) => a.phase === "preTest" && a.isCorrect).length,
    postTest: answers.filter((a: any) => a.phase === "postTest" && a.isCorrect).length,
  };

  const phaseBreakdown = phases.map((phase: any) => {
    const phaseAnswers = answers.filter((answer: any) => answer.phase === phase.id);
    return {
      id: phase.id,
      name: phase.name,
      answers: phaseAnswers,
      score: phaseAnswers.filter((answer: any) => answer.isCorrect).length,
      total: phaseAnswers.length,
    };
  }).filter((phase: any) => phase.total > 0);

  // Calculate overall percentage
  const totalCorrect = answers.filter((a: any) => a.isCorrect).length;
  const totalAnswers = answers.length;
  const percentageScore = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const scoreBreakdown = [
    totalQuestions.preTest > 0 && { phase: "Pré-Test", score: correctAnswers.preTest, total: totalQuestions.preTest },
    ...phaseBreakdown.map((phase: any) => ({ phase: phase.name, score: phase.score, total: phase.total })),
    totalQuestions.postTest > 0 && { phase: "Post-Test", score: correctAnswers.postTest, total: totalQuestions.postTest },
  ].filter(Boolean);

  const renderAnswersSection = (phaseFilter: (p: string) => boolean) => {
    const sectionAnswers = answers.filter((a: any) => phaseFilter(a.phase));

    if (sectionAnswers.length === 0) {
      return (
        <EmptyState
          type="table"
          title="Aucune réponse"
          description="Aucune réponse enregistrée dans cette section."
          icon="users"
        />
      );
    }

    return (
      <div className="space-y-4">
        {sectionAnswers.map((answer: any, index: number) => (
          <div
            key={answer.questionId}
            className={`p-4 rounded-lg border-2 ${
              answer.isCorrect
                ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                : answer.isSkipped
                ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                : "border-red-200 bg-red-50 dark:bg-red-950/20"
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              {answer.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Question {index + 1}</p>
                  {answer.isSkipped && (
                    <Badge variant="secondary" className="text-xs">
                      Passée
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {answer.questionStem}
                </p>
              </div>
            </div>

            {/* Diagnostic Answer Section */}
            {answer.options && answer.options.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Diagnostic:
                </h4>
                {answer.options.map((option: any) => (
                  <div
                    key={option.id}
                    className={`p-2 rounded text-sm ${
                      option.isCorrect
                        ? "bg-green-100 dark:bg-green-900/30 border border-green-300"
                        : option.id === answer.selectedOptionId
                        ? "bg-red-100 dark:bg-red-900/30 border border-red-300"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {option.isCorrect && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      )}
                      {!option.isCorrect && option.id === answer.selectedOptionId && (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span className={option.isCorrect ? "font-medium" : ""}>
                        {option.text}
                      </span>
                    </div>
                    {option.explanation && (
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        💡 {option.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Treatment Answer Section */}
            {answer.hasTreatmentQuestion && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <TreatmentAnswersDisplay
                  correctTreatments={answer.correctTreatmentsResolved}
                  selectedTreatments={answer.selectedTreatmentsResolved}
                  isCorrect={answer.isCorrect}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/quiz">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux Quiz
          </Link>
        </Button>
      </div>

      {/* Overall Score */}
      <Card className="border-2">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            {isCompleted ? (
              <Trophy className="h-12 w-12 text-yellow-500" />
            ) : (
              <div className="h-12 w-12 text-blue-500">📋</div>
            )}
          </div>
          <CardTitle className="text-3xl">
            {totalCorrect} / {totalAnswers}
          </CardTitle>
          <CardDescription>
            {isCompleted ? "Quiz Complété" : "Quiz en Cours"} ({percentageScore}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={percentageScore} className="h-3" />
          <p className="text-center text-sm text-muted-foreground mt-4">
            Date: {new Date(attempt.startedAt).toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      {scoreBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats par Phase</CardTitle>
            <CardDescription>Votre score pour chaque section</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scoreBreakdown.map((item: any) => (
                <div key={item.phase} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.phase}</span>
                    <span className="text-lg font-bold">{item.score} / {item.total}</span>
                  </div>
                  <Progress value={item.total > 0 ? Math.round((item.score / item.total) * 100) : 0} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Review with Tabs */}
      {answers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debriefing</CardTitle>
            <CardDescription>
              {answers.filter((a: any) => a.isCorrect).length} sur {answers.length} réponses correctes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pretest" className="w-full">
              <TabsList className="flex h-auto w-full flex-col gap-1 sm:flex-row sm:flex-wrap">
                <TabsTrigger value="pretest" className="flex items-center justify-center gap-2 w-full">
                  <BookOpen className="h-4 w-4" />
                  <span>Pré-Test</span>
                  {totalQuestions.preTest > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {correctAnswers.preTest}/{totalQuestions.preTest}
                    </Badge>
                  )}
                </TabsTrigger>
                {phaseBreakdown.map((phase: any) => (
                  <TabsTrigger key={phase.id} value={phase.id} className="flex items-center justify-center gap-2 w-full sm:flex-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{phase.name.replace(/^Phase \d+ - /, "")}</span>
                    <Badge variant="outline" className="ml-1">
                      {phase.score}/{phase.total}
                    </Badge>
                  </TabsTrigger>
                ))}
                <TabsTrigger value="posttest" className="flex items-center justify-center gap-2 w-full">
                  <BookOpen className="h-4 w-4" />
                  <span>Post-Test</span>
                  {totalQuestions.postTest > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {correctAnswers.postTest}/{totalQuestions.postTest}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pretest" className="mt-6">
                {renderAnswersSection((phase) => phase === "preTest")}
              </TabsContent>

              {phaseBreakdown.map((phase: any) => (
                <TabsContent key={phase.id} value={phase.id} className="mt-6">
                  <PhaseMiniReview
                    phaseName={phase.name}
                    answers={phase.answers}
                    showContinue={false}
                  />
                </TabsContent>
              ))}

              <TabsContent value="posttest" className="mt-6">
                {renderAnswersSection((phase) => phase === "postTest")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button className="flex-1" asChild>
          <Link href="/quiz">
            Nouveau Quiz
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/profile">
            Voir mon Profil
          </Link>
        </Button>
      </div>
    </div>
  );
}
