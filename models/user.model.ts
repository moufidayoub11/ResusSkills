import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  lastName: string;
  age?: number;
  password?: string; // Optional for OAuth users
  image?: string;
  role: "student" | "professor";
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      min: 10,
      max: 120,
    },
    password: {
      type: String,
      select: false, // Don't include in queries by default
    },
    image: String,
    role: {
      type: String,
      enum: ["student", "professor"],
      default: "student",
    },
    emailVerified: Date,
  },
  { timestamps: true }
);

// Prevent model recompilation in dev
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
