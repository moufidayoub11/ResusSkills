import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config: no database adapters or Node-only deps
const authEdgeConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.role) session.user.role = token.role as "student" | "professor";
        if (token.lastName) session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
};

export const { auth } = NextAuth(authEdgeConfig);
