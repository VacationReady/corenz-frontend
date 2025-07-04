import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ message: "Run Carryover Route Test Works" });
}
