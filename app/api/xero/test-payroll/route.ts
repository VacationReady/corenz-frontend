import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getXeroAccessToken, getXeroTenantId } from "@/lib/xero";

/**
 * Test endpoint to verify Xero Payroll API access
 * Attempts to fetch employees from Xero Payroll
 * 
 * Note: This will return 403 for uncertified apps without payroll access
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get valid access token (auto-refreshes if needed)
    const accessToken = await getXeroAccessToken(session.user.companyId);
    if (!accessToken) {
      return NextResponse.json(
        { 
          error: "No valid Xero connection",
          message: "Please reconnect to Xero"
        },
        { status: 401 }
      );
    }

    // Get Xero tenant ID
    const tenantId = await getXeroTenantId(session.user.companyId);
    if (!tenantId) {
      return NextResponse.json(
        { error: "No Xero tenant ID found" },
        { status: 400 }
      );
    }

    // Make request to Xero Payroll API
    const response = await fetch(
      "https://api.xero.com/payroll.xro/2.0/Employees",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "xero-tenant-id": tenantId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    // Handle different response codes
    if (response.status === 403) {
      return NextResponse.json(
        {
          error: "Payroll access restricted",
          message: "Your Xero app does not have payroll access. This requires Xero partner certification.",
          status: 403,
        },
        { status: 403 }
      );
    }

    if (response.status === 401) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          message: "Token may be invalid. Try reconnecting to Xero.",
          status: 401,
        },
        { status: 401 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Xero Payroll API error:", errorText);
      return NextResponse.json(
        {
          error: "Payroll API request failed",
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        },
        { status: response.status }
      );
    }

    // Success - parse response
    const data = await response.json();
    const employeeCount = data.Employees?.length || 0;

    return NextResponse.json({
      success: true,
      message: "Payroll access confirmed",
      employeeCount,
      employees: data.Employees?.slice(0, 5).map((emp: any) => ({
        id: emp.EmployeeID,
        firstName: emp.FirstName,
        lastName: emp.LastName,
      })),
    });
  } catch (error) {
    console.error("Error testing Xero payroll connection:", error);
    return NextResponse.json(
      {
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
