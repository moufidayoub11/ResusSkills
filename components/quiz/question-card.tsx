import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionCardProps {
  question: {
    id: string;
    stem: string;
  };
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Question</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg leading-relaxed">{question.stem}</p>
      </CardContent>
    </Card>
  );
}
