import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

// ✅ Extend the default session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "ADMIN" | "MANAGER" | "EMPLOYEE";
      companyId: string; // ✅ Ensure companyId exists for CoreNZ HRIS
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    companyId: string; // ✅ Ensure companyId exists for CoreNZ HRIS
  }
}

// ✅ Extend JWT to include companyId
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    companyId: string; // ✅ Ensure companyId included in JWT for pipeline consistency
  }
}
