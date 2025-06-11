// pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth-options";

export default async function auth(req, res) {
  return await NextAuth(req, res, authOptions);
}
