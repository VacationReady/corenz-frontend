import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env.server";
import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const MAIN_PRODUCTION_COMPANY_ID = env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID;

export const authConfig = {
  secret: env.NEXTAUTH_SECRET,

  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    })] : []),
    ...(env.AZURE_AD_CLIENT_ID && env.AZURE_AD_CLIENT_SECRET && env.AZURE_AD_TENANT_ID ? [AzureADProvider({
      clientId: env.AZURE_AD_CLIENT_ID,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
      tenantId: env.AZURE_AD_TENANT_ID,
    })] : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.warn("[auth] Missing email/password");
            return null;
          }

          const emailInput = credentials.email.trim();
          // Fetch all users with this email (case-insensitive) across tenants
          const users = await prisma.user.findMany({
            where: { email: { equals: emailInput, mode: "insensitive" } as any },
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              companyId: true,
              firstName: true,
              lastName: true,
            },
          });

          if (!users.length) {
            console.warn("[auth] User not found for email", emailInput);
            return null;
          }

          // Try to match by password among all candidates (supports cross-tenant same email)
          for (const candidate of users) {
            if (!candidate.password) continue;
            const ok = await bcrypt.compare(credentials.password, candidate.password);
            if (ok) {
              // Validate that companyId exists
              if (!candidate.companyId || candidate.companyId.trim() === "") {
                console.error("[auth] User authenticated but has invalid companyId:", {
                  userId: candidate.id,
                  email: candidate.email,
                  companyId: candidate.companyId,
                });
                return null;
              }
              console.log("[auth] User authenticated successfully:", {
                userId: candidate.id,
                email: candidate.email,
                companyId: candidate.companyId,
                role: candidate.role,
              });
              return {
                id: candidate.id,
                email: candidate.email,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                role: candidate.role,
                companyId: candidate.companyId,
              };
            }
          }

          console.warn("[auth] Invalid password for", emailInput);
          return null;
        } catch (e) {
          console.error("[auth] authorize error", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.homeCompanyId = user.companyId;
      }

      if (trigger === "update" && session?.companyId) {
        const isSuperAdmin = token.role === "SUPER_ADMIN";
        // Allow SUPER_ADMIN to switch to any tenant by updating companyId
        if (isSuperAdmin) {
          token.companyId = session.companyId as string;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.homeCompanyId =
          (token.homeCompanyId as string | undefined) ?? token.companyId;
        session.user.canManageTenants = session.user.role === "SUPER_ADMIN";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

