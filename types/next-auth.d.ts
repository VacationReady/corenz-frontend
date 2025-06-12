import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    };
  }

  interface User {
    id: string;
    email: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  }

  interface JWT {
    id: string;
    email: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  }
}
