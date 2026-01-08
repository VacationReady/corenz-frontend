import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getXeroAccessToken, getXeroTenantId } from "@/lib/xero";
import { isAdmin } from "@/lib/roles";

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

    // Check if user is admin
    if (!isAdmin(session.user)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
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
    // Note: Xero has different payroll APIs for different regions
    // We'll try NZ first (most common for your use case)
    console.log("[Xero Payroll Test] Making request to Xero Payroll API (NZ)");
    console.log("[Xero Payroll Test] Tenant ID:", tenantId);
    
    const response = await fetch(
      "https://api.xero.com/payroll.xro/2.0/Employees",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Xero-Tenant-Id": tenantId, // Note: Capital X
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("[Xero Payroll Test] Response status:", response.status);
    
    const responseText = await response.text();
    console.log("[Xero Payroll Test] Response body:", responseText);

    // Handle different response codes
    if (response.status === 403) {
      let parsedError;
      try {
        parsedError = JSON.parse(responseText);
      } catch (e) {
        parsedError = { message: responseText };
      }
      
      return NextResponse.json(
        {
          error: "Payroll access restricted",
          message: "Your Xero app does not have payroll access. This requires Xero partner certification and the correct payroll scopes.",
          status: 403,
          details: parsedError,
        },
        { status: 403 }
      );
    }

    if (response.status === 401) {
      let parsedError;
      try {
        parsedError = JSON.parse(responseText);
      } catch (e) {
        parsedError = { message: responseText };
      }
      
      return NextResponse.json(
        {
          error: "Authentication failed",
          message: "The Xero Payroll API returned 401. This usually means: 1) Your app doesn't have payroll scopes enabled, 2) The token is invalid, or 3) The payroll API requires different authentication.",
          status: 401,
          details: parsedError,
          hint: "Check that your Xero app has payroll scopes: payroll.employees, payroll.payruns, payroll.payitems",
        },
        { status: 401 }
      );
    }

    if (!response.ok) {
      let parsedError;
      try {
        parsedError = JSON.parse(responseText);
      } catch (e) {
        parsedError = { message: responseText };
      }
      
      console.error("Xero Payroll API error:", parsedError);
      return NextResponse.json(
        {
          error: "Payroll API request failed",
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          details: parsedError,
        },
        { status: response.status }
      );
    }

    // Success - parse response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Xero response:", responseText);
      throw new Error("Invalid JSON response from Xero");
    }
    
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
