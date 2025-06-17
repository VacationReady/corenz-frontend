// app/lib/auth-options.ts

import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prismadb";
import bcrypt from "bcrypt";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
    authorize: async (credentials) => {
  if (!credentials?.email || !credentials?.password) {
    console.log("❌ Missing email or password");
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase().trim() },
  });

  if (!user) {
    console.log("❌ User not found:", credentials.email);
    return null;
  }

  const isValid = await bcrypt.compare(credentials.password, user.password);

  if (!isValid) {
    console.log("❌ Invalid password for:", credentials.email);
    return null;
  }

  console.log("✅ Login success for:", user.email);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role, // ✅ must include this
  };
},
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role;
      token.id = user.id;
    }
    return token;
  },
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "MANAGER" | "EMPLOYEE";
    }
    return session;
  },
},

  secret: process.env.JWT_SECRET,
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
};
