// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import prisma from "@/lib/prisma";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
