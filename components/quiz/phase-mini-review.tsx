"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { continueAfterPhaseReview } from "@/actions/quiz.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreatmentAnswersDisplay } from "./treatment-answers-display";

interface PhaseReviewAnswer {
  questionId: string;
  questionStem: string;
  caseTitle?: string | null;
  patientName?: string | null;
  isCorrect: boolean;
  isSkipped?: boolean;
  correctTreatmentsResolved: any[];
  selectedTreatmentsResolved: any[];
}

interface PhaseMiniReviewProps {
  attemptId?: string;
  phaseName: string;
  answers: PhaseReviewAnswer[];
  showContinue?: boolean;
}

export function PhaseMiniReview({
  attemptId,
  phaseName,
  answers,
  showContinue = true,
}: PhaseMiniReviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const defaultTab = answers[0]?.questionId || "empty";
  const correctCount = answers.filter((answer) => answer.isCorrect).length;

  const handleContinue = async () => {
    if (!attemptId) return;

    setIsLoading(true);
    try {
      const result = await continueAfterPhaseReview(attemptId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error || "Impossible de continuer");
      }
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Debriefing de phase</CardTitle>
            <CardDescription>{phaseName}</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">
            {correctCount} / {answers.length} cas correct{answers.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {answers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune réponse enregistrée pour cette phase.</p>
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="flex h-auto w-full flex-col gap-1 sm:grid sm:grid-cols-4 sm:gap-0">
              {answers.map((answer, index) => (
                <TabsTrigger
                  key={answer.questionId}
                  value={answer.questionId}
                  className="flex w-full items-center justify-center gap-2"
                >
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Cas {index + 1}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {answers.map((answer) => (
              <TabsContent key={answer.questionId} value={answer.questionId} className="mt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{answer.caseTitle || answer.questionStem}</h3>
                      {answer.isSkipped && <Badge variant="secondary">Passée</Badge>}
                    </div>
                    {answer.patientName && (
                      <p className="text-sm text-muted-foreground">Patient: {answer.patientName}</p>
                    )}
                  </div>

                  <TreatmentAnswersDisplay
                    correctTreatments={answer.correctTreatmentsResolved}
                    selectedTreatments={answer.selectedTreatmentsResolved}
                    isCorrect={answer.isCorrect}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {showContinue && (
          <Button onClick={handleContinue} disabled={isLoading || !attemptId} className="w-full" size="lg">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
