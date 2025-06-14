// pages/api/auth/[...nextauth].ts

import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Explicitly cast authOptions to AuthOptions type if needed
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return await NextAuth(req, res, authOptions);
}
