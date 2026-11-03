import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserAnswer extends Document {
  _id: string;
  attemptId: mongoose.Types.ObjectId;
  questionId: string; // e.g., "pre-1", "p1-c1", "post-1"
  questionType: "mcq" | "clinical-case";
  phase: string;
  selectedOptionId: string | null;
  correctOptionId?: string;
  correctTreatmentIds?: string[]; // For treatment questions
  isCorrect: boolean;
  isSkipped?: boolean;
  answeredAt: Date;
  timeSpent?: number; // seconds spent on question
}

const UserAnswerSchema = new Schema<IUserAnswer>({
  attemptId: {
    type: Schema.Types.ObjectId,
    ref: "QuizAttempt",
    required: true,
    index: true,
  },
  questionId: {
    type: String,
    required: true,
  },
  questionType: {
    type: String,
    enum: ["mcq", "clinical-case"],
    required: true,
  },
  phase: {
    type: String,
    required: true,
  },
  selectedOptionId: {
    type: String,
    default: null,
  },
  correctOptionId: {
    type: String,
    required: false,
  },
  correctTreatmentIds: {
    type: [String],
    required: false,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  isSkipped: {
    type: Boolean,
    default: false,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  answeredAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
UserAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export const UserAnswer: Model<IUserAnswer> =
  mongoose.models.UserAnswer ||
  mongoose.model<IUserAnswer>("UserAnswer", UserAnswerSchema);
