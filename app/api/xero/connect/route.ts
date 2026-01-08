import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
    scope: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "accounting.settings.read",
      "accounting.contacts.read",
    ].join(" "),
    state: "peoplecore_xero",
  });

  return NextResponse.redirect(
    "https://login.xero.com/identity/connect/authorize?" + params.toString()
  );
}
