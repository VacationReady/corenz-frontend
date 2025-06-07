import { signOut } from "next-auth/react";

<Button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</Button>
