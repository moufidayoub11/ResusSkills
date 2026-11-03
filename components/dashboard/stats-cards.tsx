import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/types/index";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const statCards = [
    {
      icon: Users,
      label: "Étudiants Totaux",
      value: stats.totalStudents,
      description: "nombre d'étudiants",
    },
    {
      icon: BookOpen,
      label: "Tentatives Totales",
      value: stats.totalAttempts,
      description: "quiz complétés",
    },
    {
      icon: Trophy,
      label: "Taux de Complétion",
      value: `${Math.round(stats.completionRate)}%`,
      description: "quiz terminés",
    },
    {
      icon: TrendingUp,
      label: "Score Moyen",
      value: `${Math.round(stats.avgScore)}%`,
      description: "score moyen des étudiants",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
