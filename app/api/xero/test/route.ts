import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { xeroApiRequest } from "@/lib/xero";

/**
 * Test endpoint to verify Xero connection and token refresh
 * Fetches the organization details from Xero
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Make a test API call to Xero - fetch organization details
    const response = await xeroApiRequest(
      session.user.companyId,
      "/Organisation"
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Xero API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch from Xero API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      organization: data.Organisations?.[0],
    });
  } catch (error) {
    console.error("Error testing Xero connection:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
