import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { ownerIdFromAccount } from "./auth-owner-id";

declare module "next-auth" {
  interface Session {
    user: { ownerId: string; name?: string | null; image?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // account finns bara i anropet direkt efter inloggningen.
    jwt({ token, account }) {
      if (account) token.ownerId = ownerIdFromAccount(account);
      return token;
    },
    session({ session, token }) {
      if (typeof token.ownerId === "string") {
        session.user.ownerId = token.ownerId;
      }
      return session;
    },
  },
});
