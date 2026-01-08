import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

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
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.redirect(
        new URL("/settings/system/xero-integration?error=no_session", req.url)
      );
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        new URL(
          "/settings/system/xero-integration?error=token_exchange_failed",
          req.url
        )
      );
    }

    const tokens = await tokenRes.json();

    // Get Xero tenant ID
    const connectionsRes = await fetch("https://api.xero.com/connections", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!connectionsRes.ok) {
      console.error("Failed to fetch connections");
      return NextResponse.redirect(
        new URL(
          "/settings/system/xero-integration?error=connection_fetch_failed",
          req.url
        )
      );
    }

    const connections = await connectionsRes.json();
    if (!connections || connections.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/settings/system/xero-integration?error=no_xero_organization",
          req.url
        )
      );
    }

    const xeroTenantId = connections[0].tenantId;

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store in database
    await prisma.xeroIntegration.upsert({
      where: { companyId: session.user.companyId },
      create: {
        companyId: session.user.companyId,
        xeroTenantId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        tokenType: tokens.token_type || "Bearer",
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
      },
      update: {
        xeroTenantId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
        isActive: true,
        connectedAt: new Date(),
      },
    });

    console.log("Xero integration saved successfully");

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
