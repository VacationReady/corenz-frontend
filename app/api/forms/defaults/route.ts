import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Minimal built-in screen definitions. These are created per-company on demand.
// Slugs must be unique per company.
const BUILTIN_SCREENS = [
  {
    slug: "contact-info",
    name: "Contact Information",
    description: "Address and basic contact details",
    formType: "DATA_SCREEN",
    schema: [
      { id: "addressStreet", type: "text", label: "Street", required: false },
      { id: "addressCity", type: "text", label: "City", required: false },
      { id: "addressPostcode", type: "text", label: "Postcode", required: false },
      { id: "addressCountry", type: "text", label: "Country", required: false },
      { id: "phone", type: "text", label: "Phone", required: false },
    ],
  },
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
  {
    slug: "employment-checks",
    name: "Employment Checks",
    description: "Right-to-work and certifications",
    formType: "DATA_SCREEN",
    schema: [
      { id: "rtwDocument", type: "file", label: "Right to Work Document", required: false },
      { id: "rtwExpiry", type: "date", label: "RTW Expiry", required: false },
      { id: "certifications", type: "list", label: "Certifications", required: false },
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


