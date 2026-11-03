import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle } from "lucide-react";

interface StudentQuizViewerProps {
  attempt: any;
  currentQuestion: any;
  progress: any;
}

export function StudentQuizViewer({ attempt, currentQuestion, progress }: StudentQuizViewerProps) {
  const options = currentQuestion?.options || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Visionnage - {attempt.userId}</CardTitle>
          <CardDescription>{attempt.status === 'completed' ? 'Tentative terminée' : 'En cours'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Question</h3>
            <p className="text-sm text-muted-foreground">{currentQuestion?.stem || currentQuestion?.title || 'Aucune question'}</p>
          </div>

          {options.length > 0 && <div className="space-y-2">
            {options.map((opt: any) => (
              <div key={opt.id} className={`p-3 rounded border ${opt.isCorrect ? 'border-green-200 bg-green-50' : ''}`}>
                <div className="flex items-center gap-2">
                  {opt.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>{opt.text}</span>
                </div>
              </div>
            ))}
          </div>}

          <div className="mt-4">
            <Progress value={progress?.percentage || 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">Phase: {progress?.phaseName} — Question {progress?.current}/{progress?.total}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentQuizViewer;
