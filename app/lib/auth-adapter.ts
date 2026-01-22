import { Adapter, AdapterUser } from "next-auth/adapters";
import { prisma } from "./prisma";

// Use 'any' for db operations since Prisma types may not be fully loaded in IDE
// The Account model exists in schema.prisma and works at runtime
const db = prisma as any;

/**
 * Custom Prisma Adapter for multi-tenant schema
 * 
 * The default PrismaAdapter expects `email` to be unique, but our User model
 * has a compound unique key `@@unique([email, companyId])` for multi-tenancy.
 * 
 * This adapter handles OAuth sign-in by:
 * 1. Looking up users by email using findFirst (not findUnique)
 * 2. Linking OAuth accounts to existing users if found
 * 3. NOT auto-creating new users (OAuth users must exist in the system first)
 */
export function CustomPrismaAdapter(): Adapter {
  return {
    async createUser(data) {
      // OAuth should not auto-create users in a multi-tenant system
      // Users must be created by admins with proper companyId assignment
      throw new Error(
        "OAuth sign-in requires an existing account. Please contact your administrator to create your account first."
      );
    },

    async getUser(id) {
      const user = await db.user.findUnique({
        where: { id },
      });
      if (!user) return null;
      return mapUserToAdapterUser(user);
    },

    async getUserByEmail(email) {
      // Use findFirst instead of findUnique since email is not unique alone
      const user = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (!user) return null;
      return mapUserToAdapterUser(user);
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await db.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { user: true },
      });
      if (!account?.user) return null;
      return mapUserToAdapterUser(account.user);
    },

    async updateUser(data) {
      const { id, ...updateData } = data;
      const user = await db.user.update({
        where: { id },
        data: {
          name: updateData.name,
          email: updateData.email,
          emailVerified: updateData.emailVerified,
        },
      });
      return mapUserToAdapterUser(user);
    },

    async deleteUser(userId) {
      await db.user.delete({ where: { id: userId } });
    },

    async linkAccount(data) {
      await db.account.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expires_at: data.expires_at,
          token_type: data.token_type,
          scope: data.scope,
          id_token: data.id_token,
          session_state: data.session_state as string | undefined,
        },
      });
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db.account.delete({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
      });
    },

    async createSession(data) {
      // We use JWT strategy, so sessions are not stored in DB
      // This is a no-op but required by the interface
      return {
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: data.expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      // We use JWT strategy, so this is not used
      return null;
    },

    async updateSession(data) {
      // We use JWT strategy, so this is not used
      return null;
    },

    async deleteSession(sessionToken) {
      // We use JWT strategy, so this is a no-op
    },

    async createVerificationToken(data) {
      // VerificationToken model doesn't exist in schema - not used with OAuth
      return data;
    },

    async useVerificationToken({ identifier, token }) {
      // VerificationToken model doesn't exist in schema - not used with OAuth
      return null;
    },
  };
}

/**
 * Map Prisma User to NextAuth AdapterUser
 */
function mapUserToAdapterUser(user: {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  companyId: string;
}): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
    // Extended properties for our app
    role: user.role,
    companyId: user.companyId,
  } as AdapterUser;
}
