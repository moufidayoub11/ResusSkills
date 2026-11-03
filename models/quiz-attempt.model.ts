import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuizAttempt extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  status: "in-progress" | "completed" | "abandoned";
  currentPhase: string; // "preTest" | "phase-1" | "phase-2" | "phase-3" | "phase-4" | "postTest"
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
  // Gamification stats
  combo: number;
  maxCombo: number;
  fastAnswers: number; // answers under 10 seconds
  achievements: string[]; // achievement IDs
  skippedCount: number;
  //
  startedAt: Date;
  completedAt?: Date;
  timeSpentSeconds: number;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned"],
      default: "in-progress",
    },
    currentPhase: {
      type: String,
      default: "preTest",
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    pendingReviewPhase: {
      type: String,
      default: null,
    },
    scores: {
      preTest: { type: Number, default: 0 },
      phase1: { type: Number, default: 0 },
      phase2: { type: Number, default: 0 },
      phase3: { type: Number, default: 0 },
      phase4: { type: Number, default: 0 },
      postTest: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    // Gamification fields
    combo: {
      type: Number,
      default: 0,
    },
    maxCombo: {
      type: Number,
      default: 0,
    },
    fastAnswers: {
      type: Number,
      default: 0,
    },
    achievements: {
      type: [String],
      default: [],
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    //
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt ||
  mongoose.model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
