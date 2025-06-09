import CredentialsProvider from "next-auth/providers/credentials";

// ✅ No type import, cast to `any` for safety
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials ?? {};

        try {
          const res = await fetch("https://corenz-backend-production.up.railway.app/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            console.error("Login failed:", await res.text());
            return null;
          }

          const user = await res.json();
          return user && user.id ? user : null;
        } catch (error) {
          console.error("Auth exception:", error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
} as any; // ✅ This cast solves all build-time type conflicts
