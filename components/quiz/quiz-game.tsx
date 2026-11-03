"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { submitAnswer, nextQuestion, skipQuestion, completeQuiz, previousQuestion } from "@/actions/quiz.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SkipForward, CheckCircle, SkipBack, Volume2, VolumeX } from "lucide-react";
import { QuestionCard } from "./question-card";
import { ClinicalCaseCard } from "./clinical-case-card";
import { TreatmentOptionsSelector } from "./treatment-options-selector";
import { QuizAttemptType } from "@/types/index";
import { QuizTimer } from "./quiz-timer";
import { ComboDisplay, ComboDisplayCompact } from "./combo-display";
import { AchievementQueue } from "./achievement-toast";
import { useSound } from "@/hooks/use-sound";
import { ACHIEVEMENTS, checkAchievements, Achievement } from "@/lib/achievements";
import Confetti from "react-confetti";
import { PhaseMiniReview } from "./phase-mini-review";

const QCM_TIME_LIMIT = 60; // seconds per QCM question
const CLINICAL_CASE_TIME_LIMIT = 120; // seconds per clinical case (double time)

interface QuizGameProps {
  attemptId: string;
  attempt: QuizAttemptType;
  currentQuestion: any;
  progress: {
    current: number;
    total: number;
    percentage: number;
    phaseName?: string;
    answered?: number;
  };
  gamification?: {
    combo: number;
    maxCombo: number;
    fastAnswers: number;
    achievements: string[];
    skippedCount: number;
  };
  phaseReview?: {
    phaseId: string;
    phaseName: string;
    shockType: string;
    answers: any[];
  } | null;
  viewOnly?: boolean;
}

export function QuizGame({
  attemptId,
  attempt,
  currentQuestion,
  progress,
  gamification,
  phaseReview,
  viewOnly = false,
}: QuizGameProps) {
  const router = useRouter();
  const { playSound, enabled: soundEnabled, toggleSound, initializeAudio } = useSound();

  // Core quiz state
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Timer state
  const [timerKey, setTimerKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const questionStartTime = useRef(Date.now());

  // Gamification state
  const [combo, setCombo] = useState(gamification?.combo || 0);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>(gamification?.achievements || []);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState(100);

  // Reset local state whenever the question changes
  useEffect(() => {
    if (!currentQuestion?.id) return;

    setSelectedAnswer("");
    setSelectedTreatments([]);
    setAnswered(false);
    setIsCorrect(false);
    setIsLoading(false);
    setIsPaused(false);
    setTimerKey((prev) => prev + 1);
    questionStartTime.current = Date.now();
  }, [currentQuestion?.id]);

  // Handle achievements display
  const showAchievements = useCallback((achievementIds: string[]) => {
    const achievements = achievementIds
      .map((id) => ACHIEVEMENTS[id])
      .filter(Boolean);
    
    if (achievements.length > 0) {
      setPendingAchievements(achievements);
      playSound("achievement");
    }
  }, [playSound]);

  // Timer tick handler
  const handleTimerTick = useCallback((remaining: number) => {
    if (remaining <= 10 && remaining > 0) {
      playSound("tick");
    }
  }, [playSound]);

  // Timer timeout handler
  const handleTimeout = useCallback(async () => {
    if (answered) return;
    
    playSound("wrong");
    toast.error("Temps écoulé!");
    
    // Auto-skip the question
    setIsLoading(true);
    try {
      const result = await skipQuestion(attemptId, currentQuestion.id);
      if (result.success) {
        setCombo(0);
        if (result.data?.isComplete) {
          router.push(`/quiz/${attemptId}/review`);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [answered, attemptId, currentQuestion.id, playSound, router]);

  const handleSubmitAnswer = async () => {
    const hasDiagnosticQuestion = currentQuestion.options && currentQuestion.options.length > 0;
    const hasTreatmentQuestion = currentQuestion.priseEnChargeCorrectIds !== undefined;
    
    // Validate based on question type
    if (hasDiagnosticQuestion && !selectedAnswer) {
      toast.error("Veuillez sélectionner un diagnostic");
      return;
    }
    
    if (hasTreatmentQuestion && selectedTreatments.length === 0) {
      toast.error("Veuillez sélectionner au moins une option de prise en charge");
      return;
    }

    // Initialize audio on first interaction
    initializeAudio();
    setIsPaused(true);
    setIsLoading(true);

    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

    try {
      const answerToSubmit = hasTreatmentQuestion
        ? JSON.stringify(selectedTreatments)
        : selectedAnswer;

      const result = await submitAnswer(attemptId, currentQuestion.id, answerToSubmit, timeSpent);
      if (result.success) {
        setAnswered(true);
        const correct = result.data?.isCorrect || false;
        setIsCorrect(correct);
        
        if (correct) {
          playSound("correct");
          toast.success("Bonne réponse! 🎉");
          
          const newCombo = result.data?.combo || 0;
          setCombo(newCombo);
          setCorrectCount((prev) => prev + 1);

          // Show confetti based on combo
          if (newCombo >= 3) {
            playSound("combo");
            setConfettiPieces(newCombo >= 10 ? 300 : newCombo >= 5 ? 200 : 100);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }

          // Check for achievements
          const newAchievements = checkAchievements(
            {
              combo: newCombo,
              maxCombo: result.data?.maxCombo || newCombo,
              correctCount: correctCount + 1,
              totalAnswered: (progress.answered || 0) + 1,
              timeSpent,
              skippedCount: gamification?.skippedCount || 0,
            },
            earnedAchievements
          );

          if (newAchievements.length > 0) {
            setEarnedAchievements((prev) => [...prev, ...newAchievements]);
            showAchievements(newAchievements);
          }
        } else {
          playSound("wrong");
          toast.error("Mauvaise réponse");
          setCombo(0);
        }
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    setIsLoading(true);
    playSound("click");
    
    try {
      const result = await nextQuestion(attemptId);
      if (result.success) {
        if (result.data?.phaseReview) {
          router.refresh();
          return;
        }
        if (result.data?.isComplete) {
          playSound("victory");
          router.push(`/quiz/${attemptId}/review`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error || "Erreur lors du passage à la question suivante");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipQuestion = async () => {
    initializeAudio();
    setIsLoading(true);
    playSound("skip");
    
    try {
      const result = await skipQuestion(attemptId, currentQuestion.id);
      if (result.success) {
        setCombo(0);
        if (result.data?.phaseReview) {
          router.refresh();
        } else if (result.data?.isComplete) {
          router.push(`/quiz/${attemptId}/review`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error || "Erreur lors du passage");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteQuiz = async () => {
    setIsLoading(true);
    try {
      const result = await completeQuiz(attemptId);
      if (result.success) {
        playSound("victory");
        toast.success("Quiz terminé!");
        router.push(`/quiz/${attemptId}/review`);
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = async () => {
    setIsLoading(true);
    playSound("click");
    
    try {
      const result = await previousQuestion(attemptId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error || "Impossible de revenir à la question précédente");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isClinicalCase = currentQuestion.patient !== undefined;
  const hasTreatmentQuestion = currentQuestion.priseEnChargeCorrectIds !== undefined;
  
  // Determine duration based on question type
  const questionDuration = isClinicalCase ? CLINICAL_CASE_TIME_LIMIT : QCM_TIME_LIMIT;

  if (phaseReview) {
    return (
      <PhaseMiniReview
        attemptId={viewOnly ? undefined : attemptId}
        phaseName={phaseReview.phaseName}
        answers={phaseReview.answers}
        showContinue={!viewOnly}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 1200}
          height={typeof window !== "undefined" ? window.innerHeight : 800}
          numberOfPieces={confettiPieces}
          recycle={false}
          gravity={0.3}
        />
      )}

      {/* Achievement Toasts */}
      <AchievementQueue
        achievements={pendingAchievements}
        onComplete={() => setPendingAchievements([])}
      />

      {/* Progress Card with Timer and Combo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Progress info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle>Progression</CardTitle>
                {/* Sound toggle */}
                {!viewOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      initializeAudio();
                      toggleSound();
                    }}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                {progress.phaseName} | Question {progress.current} sur {progress.total}
                {/* Compact combo in header */}
                <ComboDisplayCompact combo={combo} />
              </CardDescription>
            </div>

            {/* Right: Timer and percentage */}
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-primary">{progress.percentage}%</div>
              {!viewOnly && (
                <QuizTimer
                  key={timerKey}
                  duration={questionDuration}
                  onTimeout={handleTimeout}
                  isPaused={isPaused || answered}
                  onTick={handleTimerTick}
                />
              )}
            </div>
          </div>
          <Progress value={progress.percentage} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Combo Display (when active) */}
      {combo >= 3 && (
        <div className="flex justify-center animate-float">
          <ComboDisplay combo={combo} />
        </div>
      )}

      {/* Question */}
      <div>
        {isClinicalCase ? (
          <ClinicalCaseCard question={currentQuestion} />
        ) : (
          <QuestionCard question={currentQuestion} />
        )}
      </div>

      {/* Treatment Options (if has treatment question) */}
      {hasTreatmentQuestion && (
        <TreatmentOptionsSelector
          selectedOptions={selectedTreatments}
          onSelectionChange={setSelectedTreatments}
          disabled={answered || viewOnly}
        />
      )}


      {/* MCQ answer options */}
      {!isClinicalCase && currentQuestion.options && currentQuestion.options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionnez votre réponse</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              className="mb-4"
              value={selectedAnswer}
              onValueChange={(value) => {
                initializeAudio();
                playSound("click");
                setSelectedAnswer(value);
              }}
              disabled={answered || viewOnly}
            >
              <div className="space-y-3">
                {currentQuestion.options.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} disabled={answered} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      <span
                        className={`block p-3 rounded-lg transition-all duration-200 ${
                          answered
                            ? option.id === currentQuestion.options.find((o: any) => o.isCorrect)?.id
                              ? "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100 ring-2 ring-green-500"
                              : option.id === selectedAnswer
                              ? "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 ring-2 ring-red-500"
                              : "bg-muted"
                            : selectedAnswer === option.id
                            ? "bg-primary/10 border-2 border-primary scale-[1.02]"
                            : "bg-muted hover:bg-muted/80 hover:scale-[1.01]"
                        }`}
                      >
                        {option.text}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            {answered && (
              <div
                className={`my-4 p-4 rounded-lg flex items-center gap-3 ${
                  isCorrect
                    ? "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100"
                    : "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100"
                }`}
              >
                <div className="text-2xl">{isCorrect ? "🎉" : "😔"}</div>
                <div>
                  <p className="font-bold text-lg">
                    {isCorrect ? "Bonne réponse!" : "Mauvaise réponse"}
                  </p>
                  {isCorrect && combo >= 3 && (
                    <p className="text-sm opacity-80">Combo x{combo}! 🔥</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      

      {/* Submit/Navigation Card */}
      <Card>
        <CardContent className="pt-6">
          {!viewOnly && (
            <div className="space-y-4">
              {/* Main Action Buttons */}
              <div className="flex items-center gap-3">
              {/* Go Back Button */}
                <Button
                  onClick={handleGoBack}
                  disabled={isLoading}
                  variant="outline"
                  size="lg"
                  className="px-4"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <SkipBack className="h-5 w-5" />
                </Button>

                {/* Validate/Next Button - Center and Larger */}
                {!answered ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={
                      (currentQuestion.options && currentQuestion.options.length > 0 && !selectedAnswer) ||
                      (hasTreatmentQuestion && selectedTreatments.length === 0) ||
                      isLoading
                    }
                    className="flex-1 h-12 text-base"
                    size="lg"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Valider
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={isLoading}
                    className="flex-1 h-12 text-base"
                    size="lg"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {progress.current === progress.total
                      ? (attempt.currentPhase === "postTest" ? "Résultats" : "Voir le debriefing")
                      : "Suivant"}
                  </Button>
                )}

                {/* Skip Button */}
                {!answered && (
                  <Button
                    onClick={handleSkipQuestion}
                    disabled={isLoading}
                    variant="outline"
                    size="lg"
                    className="px-4"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <SkipForward className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Finish Quiz Button - Full Width */}
              <Button
                onClick={handleCompleteQuiz}
                disabled={isLoading}
                variant="secondary"
                className="w-full py-6 text-base"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Terminer le Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
