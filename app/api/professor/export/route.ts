import { NextResponse } from "next/server";
import { professorContext } from "@/lib/professor/context";
import { datasetExport } from "@/lib/professor/export";
import { parseQuery } from "@/lib/professor/query";
import { ProfessorError } from "@/lib/professor/service";
import type { Resource } from "@/lib/professor/types";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Origine non autorisée." },
      { status: 403 },
    );
  try {
    const ctx = await professorContext();
    const input = await request.json();
    if (input.identified && input.confirmation !== "EXPORTER")
      return NextResponse.json(
        { error: "Confirmez explicitement l’export identifié." },
        { status: 400 },
      );
    const source = ["accounts", "attempts", "answers"].includes(input.source)
      ? (input.source as Resource)
      : undefined;
    const result = await datasetExport(
      ctx.db,
      ctx.actor,
      parseQuery(input.query ?? {}),
      Boolean(input.identified),
      source,
    );
    return new Response(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ProfessorError
            ? error.message
            : "Export indisponible. Réessayez.",
      },
      { status: error instanceof ProfessorError ? 403 : 500 },
    );
  }
}
