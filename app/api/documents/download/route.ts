import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 5); // 5-minute expiry

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data?.signedUrl });
}
