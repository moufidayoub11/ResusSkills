"use server";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user.model";
import { QuizAttempt } from "@/models/quiz-attempt.model";
import { UserAnswer } from "@/models/user-answer.model";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  age: z.coerce.number().min(10).max(120).optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ProfilePayload = {
  name: string;
  lastName: string;
  age?: number | null;
};

type ActionResult = { success: true } | { error: string };

export async function updateProfile(payload: ProfilePayload): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const validatedFields = profileSchema.safeParse(payload);

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Données invalides" };
  }

  try {
    await connectDB();
    await User.findByIdAndUpdate(session.user.id, validatedFields.data);
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { error: "Une erreur est survenue" };
  }
}

type PasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function changePassword(payload: PasswordPayload): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const validatedFields = passwordSchema.safeParse(payload);

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Données invalides" };
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select("+password");

    if (!user) {
      return { error: "Utilisateur non trouvé" };
    }

    // If user has no password (OAuth only), allow setting one
    if (user.password) {
      const isValid = await bcrypt.compare(
        validatedFields.data.currentPassword,
        user.password
      );
      if (!isValid) {
        return { error: "Mot de passe actuel incorrect" };
      }
    }

    const hashedPassword = await bcrypt.hash(validatedFields.data.newPassword, 12);
    await User.findByIdAndUpdate(session.user.id, { password: hashedPassword });

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "Une erreur est survenue" };
  }
}

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  
  if (!user) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    age: user.age,
    image: user.image,
    role: user.role,
    hasPassword: !!user.password,
    createdAt: user.createdAt,
  };
}


// Closed legacy endpoints: mutations now require a reason, preview and transaction.
export async function updateUserRole(_userId: string, _newRole: "student" | "professor") { return { success: false, error: "Utilisez le formulaire de compte dans l’espace professeur." }; }
export async function deleteUser(_userId: string) { return { success: false, error: "Utilisez la suppression confirmée dans l’espace professeur." }; }
