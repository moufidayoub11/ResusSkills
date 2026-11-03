"use client";

import { Button } from "@/components/ui/button";
import { startQuiz } from "@/actions/quiz.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface QuizStartButtonProps {
  inProgressAttemptId?: string;
}

export function QuizStartButton({ inProgressAttemptId }: QuizStartButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartQuiz = async () => {
    setIsLoading(true);
    try {
      const result = await startQuiz();
      if (result.success && result.data?.id) {
        router.push(`/quiz/${result.data.id}`);
      } else {
        toast.error(result.error || "Erreur lors du démarrage du quiz");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeQuiz = () => {
    if (inProgressAttemptId) {
      router.push(`/quiz/${inProgressAttemptId}`);
    }
  };

  return (
    <div className="flex gap-4 pt-4">
      {inProgressAttemptId ? (
        <Button
          size="lg"
          onClick={handleResumeQuiz}
          className="flex-1"
        >
          Continuer le Quiz
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={handleStartQuiz}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Commencer un Nouveau Quiz
        </Button>
      )}
    </div>
  );
}
