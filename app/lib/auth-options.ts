// app/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  debug: true, // enable debug logs

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🚩 authorize triggered", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.log("DB user found:", user);

          if (!user || !user.password) {
            console.log("❌ User not found or missing password");
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          console.log("Password valid:", isValid);

          if (!isValid) {
            console.log("❌ Invalid password");
            return null;
          }

          // Return minimal safe user object
          return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}` || user.email,
            email: user.email,
            role: user.role ?? "EMPLOYEE", // fallback to prevent undefined
          };
        } catch (error) {
          console.error("❌ Error in authorize:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      console.log("JWT callback", { token, user });
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback", { session, token });
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        role: (token.role as "ADMIN" | "MANAGER" | "EMPLOYEE") ?? "EMPLOYEE",
      };
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/unauthorized",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
