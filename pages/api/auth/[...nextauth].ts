import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default (req: NextApiRequest, res: NextApiResponse) =>
  NextAuth(req, res, authOptions);
