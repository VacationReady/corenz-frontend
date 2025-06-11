// pages/api/auth/[...nextauth].ts

const NextAuth = require("next-auth").default; // ✅ Fix for type issue
const { authOptions } = require("@/lib/auth-options");

export default NextAuth(authOptions);
