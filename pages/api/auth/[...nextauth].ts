import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
