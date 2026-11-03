"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { EmptyState } from "./empty-state";

interface PhaseChartProps {
  data: {
    phase: string;
    average: number;
  }[];
}

export function PhaseChart({ data }: PhaseChartProps) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        type="chart"
        title="Aucune donnée disponible"
        description="Les données de performance par phase apparaîtront ici une fois que les étudiants auront complété des quiz."
        icon="line"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="phase" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="average"
          stroke="#10b981"
          name="Score moyen (%)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
