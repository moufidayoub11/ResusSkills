import "server-only";
import { MongoClient } from "mongodb";
import { auth } from "@/lib/auth";
import { requireActor, ProfessorError } from "./service";

declare global {
  var professorMongo: MongoClient | undefined;
}
export async function professorContext() {
  const session = await auth();
  if (!session?.user?.id)
    throw new ProfessorError(
      "Connectez-vous pour continuer.",
      "UNAUTHENTICATED",
    );
  const client =
    global.professorMongo ??
    new MongoClient(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 15000,
    });
  global.professorMongo = client;
  await client.connect();
  const db = client.db();
  const actor = await requireActor(db, session.user.id);
  return { client, db, actor };
}
