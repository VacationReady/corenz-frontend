import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import {
  getAvailableScreensWithMetadata,
  getActionDisplayName,
} from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return full screen metadata including displayLabel, description, category, and affectsOthers
  const screens = getAvailableScreensWithMetadata().map((screen) => ({
    key: screen.key,
    label: screen.label,
    displayLabel: screen.displayLabel,
    description: screen.description,
    category: screen.category,
    affectsOthers: screen.affectsOthers,
  }));

  const actions: { key: "read" | "edit" | "delete"; label: string }[] = [
    { key: "read", label: getActionDisplayName("read") },
    { key: "edit", label: getActionDisplayName("edit") },
    { key: "delete", label: getActionDisplayName("delete") },
  ];

  return NextResponse.json({ screens, actions });
}


