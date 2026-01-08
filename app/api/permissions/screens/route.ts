import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import {
  getAvailableScreensWithMetadata,
  getActionDisplayName,
} from "@/lib/permissions";

// Screens that should be hidden from the permission editor UI
// The "employees" permission is hidden because:
// 1. It's a "super permission" that grants full access to ALL employee profiles
// 2. The label "Employee Directory" is misleading - admins might check it thinking it just controls list access
// 3. Managers already see their team via role-based access
// 4. The "Other Employees' Profiles" section is the proper way to grant specific screen access
// 5. Keeping it visible creates a security risk through confusing UX
const HIDDEN_SCREENS = ['employees'];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return full screen metadata including displayLabel, description, category, and affectsOthers
  // Filter out hidden screens that shouldn't appear in the permission editor
  const screens = getAvailableScreensWithMetadata()
    .filter((screen) => !HIDDEN_SCREENS.includes(screen.key))
    .map((screen) => ({
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


