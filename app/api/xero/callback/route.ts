import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Xero OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/system/xero-integration?error=${encodeURIComponent(error)}`,
        req.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings/system/xero-integration?error=no_code", req.url)
    );
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL(
          "/settings/system/xero-integration?error=token_exchange_failed",
          req.url
        )
      );
    }

    const tokens = await tokenRes.json();

    console.log("Xero tokens:", tokens);

    // TODO: Store tokens in database associated with tenant

    // Redirect to integration page with success
    return NextResponse.redirect(
      new URL("/settings/system/xero-integration?success=true", req.url)
    );
  } catch (err) {
    console.error("Error during Xero OAuth callback:", err);
    return NextResponse.redirect(
      new URL(
        "/settings/system/xero-integration?error=unexpected_error",
        req.url
      )
    );
  }
}
