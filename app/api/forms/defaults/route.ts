import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Minimal built-in screen definitions. These are created per-company on demand.
// Slugs must be unique per company.
const BUILTIN_SCREENS = [
  {
    slug: "demographic",
    name: "Demographic",
    description: "Voluntary demographic information",
    formType: "DATA_SCREEN",
    schema: [
      { id: "dateOfBirth", type: "date", label: "Date of Birth", required: false },
      { id: "gender", type: "select", label: "Gender", required: false, options: ["Female","Male","Non-binary","Prefer not to say"] },
      { id: "ethnicity", type: "text", label: "Ethnicity", required: false },
      { id: "disability", type: "select", label: "Disability", required: false, options: ["No","Yes","Prefer not to say"] },
    ],
  },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // These are templates; creation happens client-side via POST /api/forms
  return NextResponse.json(BUILTIN_SCREENS);
}


