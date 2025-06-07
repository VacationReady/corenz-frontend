import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
};
