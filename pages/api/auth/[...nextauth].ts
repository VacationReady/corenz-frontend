// pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth"; // ✅ fixed import
import { authOptions } from "@/lib/auth-options";

export default NextAuth(authOptions);
