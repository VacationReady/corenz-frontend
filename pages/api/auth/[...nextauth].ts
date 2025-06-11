// pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth/react"; // ✅ version-safe
import { authOptions } from "@/lib/auth-options";

export default NextAuth(authOptions);
