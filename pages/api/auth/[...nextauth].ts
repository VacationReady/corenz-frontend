// pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth"; // ✅ correct for Pages Router
import { authOptions } from "@/lib/auth-options";

export default NextAuth(authOptions);
