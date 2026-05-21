import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string; isAdmin?: boolean } & DefaultSession["user"];
  }
  interface User {
    isAdmin?: boolean;
  }
}

const url = process.env.DATABASE_URL || "postgres://placeholder@localhost/neondb";
const dbInstance = drizzle(neon(url), { schema });

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(dbInstance, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens
  }),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const email = String(creds.email).toLowerCase().trim();
        const password = String(creds.password);
        const [user] = await dbInstance
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        if (!user || !user.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image ?? null,
          isAdmin: !!user.isAdmin
        };
      }
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM || "Hanuone <onboarding@resend.dev>"
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        (token as { isAdmin?: boolean }).isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = String(token.id);
        (session.user as { isAdmin?: boolean }).isAdmin = !!(token as { isAdmin?: boolean }).isAdmin;
      }
      return session;
    }
  }
});
