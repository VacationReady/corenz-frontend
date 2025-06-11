// pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth"; // ✅ Correct for next-auth v4
import { authOptions } from "@/lib/auth-options";

export default NextAuth(authOptions);
