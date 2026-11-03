// Quiz Types
export interface QuizAttemptType {
  _id: string;
  userId: string;
  status: "in-progress" | "completed" | "abandoned";
  currentPhase: "preTest" | "phase-1" | "phase-2" | "phase-3" | "phase-4" | "postTest";
  currentQuestionIndex: number;
  pendingReviewPhase?: string | null;
  scores: {
    preTest: number;
    phase1: number;
    phase2: number;
    phase3: number;
    phase4: number;
    postTest: number;
    total: number;
    percentage: number;
  };
  startedAt: Date;
  completedAt?: Date;
}

export interface UserAnswerType {
  _id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  answeredAt: Date;
}

// Dashboard Types
export interface DashboardStats {
  totalStudents: number;
  totalAttempts: number;
  completedAttempts: number;
  avgScore: number;
  completionRate: number;
}

export interface StudentResult {
  id: string;
  name: string;
  lastName: string;
  email: string;
  scores: QuizAttemptType["scores"];
  completedAt: string;
}

// User Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  lastName: string;
  age?: number | null;
  image?: string | null;
  role: "student" | "professor";
  hasPassword: boolean;
}

// Action Response Types
export interface ActionResponse<T = void> {
  success?: boolean;
  error?: string;
  data?: T;
}
