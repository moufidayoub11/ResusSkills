export type Resource = "accounts" | "attempts" | "answers" | "activity";
export type AnalyticsView =
  | "scores"
  | "pre-post"
  | "questions"
  | "progression"
  | "timing";
export type Row = Record<string, any> & { id: string; revision: string };
export interface Query {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  direction: "asc" | "desc";
  from: string;
  to: string;
  students: string[];
  status: string;
  role: string;
  phase: string;
  question: string;
  minScore?: number;
  maxScore?: number;
  selection: "first" | "latest" | "all";
  availability: string;
  bins: number;
  summary: "mean" | "median";
  display: "count" | "percentage";
  grouping: "day" | "week" | "month";
  ids: string[];
  attemptId: string;
  userId: string;
}
export interface PageResult {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: "professor";
}
export interface ScoringBasis {
  denominator: number;
  reference: string;
  confirmed: boolean;
}
export interface MutationInput {
  resource: "accounts" | "attempts" | "answers";
  operation: "create" | "update" | "delete" | "password";
  id?: string;
  revision?: string;
  data: Record<string, unknown>;
  reason: string;
  confirmation?: string;
  scoring?: ScoringBasis;
  previewToken?: string;
}
export type ActionResult =
  | { success: true; id?: string; affected: Record<string, number> }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };
export interface Study {
  attempts: Row[];
  answers: Row[];
  allAttempts: Row[];
  users: Row[];
  query: Query;
  registeredStudents: number;
  orphanAnswers: number;
  orphanAttempts: number;
}
export interface Figure {
  id: string;
  title: string;
  subtitle: string;
  kind: "bar" | "line" | "scatter" | "boxplot" | "stacked" | "paired";
  labels: string[];
  series: { name: string; values: (number | number[] | null)[] }[];
  columns: string[];
  rows: (string | number | null)[][];
  unit: string;
  percent?: boolean;
  methodology: string;
  n: number;
  participants: number;
  drilldown?: string;
  categories?: string[];
}
export interface Metric {
  label: string;
  value: string;
  detail: string;
}
