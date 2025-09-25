import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  getAvailableScreens,
  getScreenDisplayName,
  getActionDisplayName,
} from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const screens = getAvailableScreens().map((key) => ({
    key,
    label: getScreenDisplayName(key),
  }));

  const actions: { key: "read" | "edit" | "delete"; label: string }[] = [
    { key: "read", label: getActionDisplayName("read") },
    { key: "edit", label: getActionDisplayName("edit") },
    { key: "delete", label: getActionDisplayName("delete") },
  ];

  return NextResponse.json({ screens, actions });
}


