import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { MongoClient } from "mongodb";
import { authConfig } from "./auth.config";
import type { Adapter } from "next-auth/adapters";

// Server-only NextAuth instance with MongoDB adapter
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

const fullAuth = NextAuth({
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  ...authConfig,
});

export const { handlers, auth, signIn, signOut } = fullAuth;
