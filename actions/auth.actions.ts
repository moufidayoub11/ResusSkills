"use server";

import { signIn, signOut } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user.model";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  name: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
});

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  lastName: string;
};

type ActionResult = { success: true; message?: string } | { error: string };

export async function registerUser(payload: RegisterPayload): Promise<ActionResult> {
  const validatedFields = registerSchema.safeParse(payload);

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Données invalides" };
  }

  const { password, name, lastName } = validatedFields.data;
  const email = validatedFields.data.email.trim().toLowerCase();

  try {
    await connectDB();

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { error: "Un compte existe déjà avec cet email" };
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      email,
      password: hashedPassword,
      name,
      lastName,
      role: "student",
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Une erreur est survenue lors de l'inscription" };
  }
}

type LoginPayload = {
  email: string;
  password: string;
};

export async function loginWithCredentials(payload: LoginPayload): Promise<ActionResult> {
  const validatedFields = loginSchema.safeParse(payload);

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Données invalides" };
  }

  try {
    await signIn("credentials", {
      email: validatedFields.data.email,
      password: validatedFields.data.password,
      redirectTo: "/quiz",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email ou mot de passe incorrect" };
        default:
          return { error: "Une erreur est survenue" };
      }
    }
    throw error;
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/quiz" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
