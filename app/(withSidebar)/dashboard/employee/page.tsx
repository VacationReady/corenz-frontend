import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import EmployeeDashboardClient from "./EmployeeDashboardClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User, Mail, Bot } from "lucide-react";

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let employeeId: string | undefined = undefined;
  if (userId && session?.user?.companyId) {
    const employee = await prisma.employee.findFirst({
      where: { userId, companyId: session.user.companyId },
      select: { id: true },
    });
    employeeId = employee?.id;
  }

  return (
    <PageShell
      title="Employee Dashboard"
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employee" },
        ],
      }}
      action={
        employeeId ? (
          <div className="flex items-center gap-2">
            <Link href={`/employees/${employeeId}/overview`}>
              <Button size="sm" icon={<User className="h-4 w-4" />}>View profile</Button>
            </Link>
            <Link href="/bulk-actions?action=messaging">
              <Button size="sm" variant="outline" icon={<Mail className="h-4 w-4" />}>Email Employee</Button>
            </Link>
            <Link href="/assistant">
              <Button size="sm" className="bg-gradient-to-r from-primary via-[hsl(var(--sunset-2))] to-[hsl(var(--sunset-3))] hover:from-primary/90 hover:via-[hsl(var(--sunset-2))]/90 hover:to-[hsl(var(--sunset-3))]/90 shadow-premium" icon={<Bot className="h-4 w-4" />}>AI Chatbot</Button>
            </Link>
          </div>
        ) : null
      }
    >
      <DashboardGrid>
        {employeeId && <LeaveSummaryCard employeeId={employeeId} />}
        <NewsWidget limit={5} />
        <EmployeeDashboardClient employeeId={employeeId} />
      </DashboardGrid>
    </PageShell>
  );
}
