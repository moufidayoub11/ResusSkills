"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { professorContext } from "@/lib/professor/context";
import {
  mutateRecord,
  previewMutation,
  ProfessorError,
} from "@/lib/professor/service";
import type { MutationInput } from "@/lib/professor/types";

function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return {
      success: false as const,
      error: "Vérifiez les champs indiqués.",
      fieldErrors: z.flattenError(error).fieldErrors,
    };
  if (error instanceof ProfessorError)
    return { success: false as const, error: error.message, code: error.code };
  if ((error as { code?: number })?.code === 11000)
    return {
      success: false as const,
      error: "Un enregistrement identique existe déjà.",
      code: "DUPLICATE",
    };
  console.error(
    "Professor operation failed",
    error instanceof Error ? error.name : "unknown",
  );
  return {
    success: false as const,
    error:
      "L’opération a échoué. Aucune modification partielle n’a été enregistrée.",
  };
}
export async function previewProfessorMutation(input: MutationInput) {
  try {
    return {
      success: true as const,
      preview: await previewMutation(await professorContext(), input),
    };
  } catch (error) {
    return failure(error);
  }
}
export async function commitProfessorMutation(input: MutationInput) {
  try {
    const result = await mutateRecord(await professorContext(), input);
    revalidatePath("/dashboard", "layout");
    revalidatePath("/quiz", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    return failure(error);
  }
}
export async function auditFigureExport(input: {
  figure: string;
  format: string;
  theme: string;
  scope: string;
  filters: string;
}) {
  try {
    const ctx = await professorContext();
    const data = z
      .object({
        figure: z.string().max(120),
        format: z.enum(["svg", "png"]),
        theme: z.enum(["light", "dark"]),
        scope: z.enum(["full", "selection"]),
        filters: z.string().max(5000),
      })
      .strict()
      .parse(input);
    await ctx.db
      .collection("professoraudit")
      .insertOne({
        kind: "event",
        action: "figure.export",
        actorId: ctx.actor.id,
        actorName: ctx.actor.name,
        targetId: data.figure,
        reason: "Export de figure",
        export: data,
        createdAt: new Date(),
      });
    return { success: true as const };
  } catch (error) {
    return failure(error);
  }
}
