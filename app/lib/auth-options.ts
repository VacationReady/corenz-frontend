import { prisma } from "./prisma";
import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { CustomPrismaAdapter } from "./auth-adapter";

const MAIN_PRODUCTION_COMPANY_ID = process.env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID;

// Debug: Log prisma client status at module load
if (!prisma) {
  console.error("[auth-options] CRITICAL: Prisma client is undefined at module load!");
} else if (!prisma.user) {
  console.error("[auth-options] CRITICAL: Prisma client exists but user model is undefined!");
}

// Validate Azure AD configuration at startup
if (process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_AD_CLIENT_SECRET || process.env.AZURE_AD_TENANT_ID) {
  const hasClientId = !!process.env.AZURE_AD_CLIENT_ID;
  const hasClientSecret = !!process.env.AZURE_AD_CLIENT_SECRET;
  const hasTenantId = !!process.env.AZURE_AD_TENANT_ID;
  
  if (!hasClientId || !hasClientSecret || !hasTenantId) {
    console.error("[auth-options] CRITICAL: Incomplete Azure AD configuration!", {
      hasClientId,
      hasClientSecret,
      hasTenantId,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    });
  } else {
    console.log("[auth-options] Azure AD provider configured:", {
      clientIdLength: process.env.AZURE_AD_CLIENT_ID?.length || 0,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      expectedCallbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
    });
  }
}

// Determine if we're in production and using secure cookies
const useSecureCookies = process.env.NODE_ENV === "production";

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  adapter: CustomPrismaAdapter(),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.callback-url"
        : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-authjs.csrf-token"
        : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: useSecureCookies
        ? "__Secure-authjs.pkce.code_verifier"
        : "authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: useSecureCookies
        ? "__Secure-authjs.state"
        : "authjs.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: useSecureCookies
        ? "__Secure-authjs.nonce"
        : "authjs.nonce",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })] : []),
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            // In v5, Azure AD (Microsoft Entra ID) uses issuer instead of tenantId
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
          }),
        ]
      : []),
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

          const emailInput = (credentials.email as string).trim();
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
              Employee: {
                select: {
                  EmployeeOffboarding: {
                    select: {
                      accessRemovedAt: true,
                      removeAccessImmediately: true,
                    },
                  },
                },
              },
            },
          });

          if (!users.length) {
            console.warn("[auth] User not found for email", emailInput);
            return null;
          }

          // Try to match by password among all candidates (supports cross-tenant same email)
          for (const candidate of users) {
            if (!candidate.password) continue;
            const ok = await bcrypt.compare(credentials.password as string, candidate.password);
            if (ok) {
              // Check if user's access has been revoked via offboarding
              const offboarding = candidate.Employee?.EmployeeOffboarding;
              if (offboarding?.accessRemovedAt || offboarding?.removeAccessImmediately) {
                console.warn("[auth] User access has been revoked:", {
                  userId: candidate.id,
                  email: candidate.email,
                  accessRemovedAt: offboarding.accessRemovedAt,
                });
                throw new Error("AccessRevoked");
              }

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
          // Re-throw AccessRevoked error so NextAuth can handle it properly
          if (e instanceof Error && e.message === "AccessRevoked") {
            throw e;
          }
          console.error("[auth] authorize error", e);
          return null;
        }
      },
    }),
  ],
  events: {
    async signIn({ user, account, profile }) {
      console.log("[auth-options] Sign in event:", {
        provider: account?.provider,
        userId: user?.id,
        email: user?.email,
      });
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect to the configured base URL to avoid stale preview deployments
      // If the url is relative, prepend the baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If the url is on the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to baseUrl
      return baseUrl;
    },
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

// Backwards-compatible alias used by existing getServerSession(authOptions) calls
export const authOptions: NextAuthConfig = authConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
