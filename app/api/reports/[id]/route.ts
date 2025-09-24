import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

interface Params {}

export const runtime = "nodejs";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user?.companyId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: idParam } = context.params;
		const id = Number(idParam);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const report = await prisma.savedReport.findFirst({
			where: { id, companyId: session.user.companyId },
			include: { User: { select: { email: true } } },
		});

		if (!report) {
			return NextResponse.json({ error: "Not Found" }, { status: 404 });
		}

		return NextResponse.json(report);
	} catch (error) {
		console.error("Error fetching report:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user?.companyId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: idParam } = context.params;
		const id = Number(idParam);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		await prisma.savedReport.deleteMany({ where: { id, companyId: session.user.companyId } });

		return NextResponse.json({ message: "Deleted successfully" });
	} catch (error) {
		console.error("Error deleting report:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
