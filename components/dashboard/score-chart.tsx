"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { EmptyState } from "./empty-state";

interface ScoreChartProps {
  data: {
    range: string;
    count: number;
  }[];
}

export function ScoreChart({ data }: ScoreChartProps) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        type="chart"
        title="Aucune donnée disponible"
        description="Les données de distribution des scores apparaîtront ici une fois que les étudiants auront complété des quiz."
        icon="bar"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" name="Nombre d'étudiants" />
      </BarChart>
    </ResponsiveContainer>
  );
}
