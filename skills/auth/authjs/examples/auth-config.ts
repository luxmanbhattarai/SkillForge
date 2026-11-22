// auth.ts — Auth.js v5. AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are read
// from the environment automatically; AUTH_SECRET is mandatory.
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [GitHub],
  callbacks: {
    // Database strategy: the callback receives { session, user }.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
