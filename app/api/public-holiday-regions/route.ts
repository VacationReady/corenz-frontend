import { NextResponse } from "next/server";

// Static region options by template; can be expanded
// Keys map to date-holidays subdivisions where applicable
const OPTIONS: Record<string, { value: string; label: string }[]> = {
  NZ: [
    { value: "NZ", label: "New Zealand (National)" },
    { value: "NZ-AUK", label: "Auckland Anniversary" },
    { value: "NZ-WGN", label: "Wellington Anniversary" },
    { value: "NZ-CAN", label: "Canterbury Anniversary" },
    { value: "NZ-OTA", label: "Otago Anniversary" },
  ],
  AU: [
    { value: "AU", label: "Australia (National)" },
    { value: "AU-NSW", label: "New South Wales" },
    { value: "AU-VIC", label: "Victoria" },
    { value: "AU-QLD", label: "Queensland" },
    { value: "AU-SA", label: "South Australia" },
    { value: "AU-WA", label: "Western Australia" },
    { value: "AU-TAS", label: "Tasmania" },
    { value: "AU-NT", label: "Northern Territory" },
    { value: "AU-ACT", label: "Australian Capital Territory" },
  ],
  UK: [
    { value: "GB-ENG", label: "England & Wales" },
    { value: "GB-SCT", label: "Scotland" },
    { value: "GB-NIR", label: "Northern Ireland" },
  ],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const template = searchParams.get("template") || "NZ";
  const opts = OPTIONS[template] || [];
  return NextResponse.json(opts);
}


