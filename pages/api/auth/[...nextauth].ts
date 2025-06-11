// pages/api/auth/[...nextauth].ts

import { authOptions } from "@/lib/auth-options";
import { handlers } from "next-auth";

const { GET, POST } = handlers(authOptions);

export { GET, POST };
