import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import Link from "next/link";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  isAdminOrManager as isAdminOrManagerHelper,
  isAdmin as isAdminHelper,
} from "@/lib/roles";
import { PageShell } from "@/components/ui/PageShell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, User } from "lucide-react";
import {
  format,
  addYears,
  addMonths,
  isAfter,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  formatDistanceStrict,
} from "date-fns";

import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/getDownloadUrl";
import ProfileAvatarUploader from "./ProfileAvatarWrapper";

function formatTenure(start: Date, end: Date) {
  if (isAfter(start, end)) {
    const untilStart = formatDistanceStrict(end, start);
    return `Starts in ${untilStart}`;
  }

  const totalMonths = differenceInMonths(end, start);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths - years * 12;
  const afterMonths = addMonths(start, years * 12 + months);
  const days = differenceInDays(end, afterMonths);

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  }
  if (days > 0 && parts.length < 2) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  if (!parts.length) {
    return "Less than a day";
  }

  return parts.join(", ");
}

function computeNextAnniversary(start: Date, reference: Date) {
  if (isAfter(start, reference)) {
    return start;
  }

  const yearsSinceStart = differenceInYears(reference, start);
  let candidate = addYears(start, yearsSinceStart + 1);

  if (!isAfter(candidate, reference)) {
    candidate = addYears(candidate, 1);
  }

  return candidate;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeOverviewPage({ params }: PageProps) {
  const { id: employeeId } = await params;
  const session = await getServerSession(authOptions);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      // 👇 include nested eventCategory on each entitlement
      LeaveEntitlement: {
        include: { EventCategory: true },
        where: { EventCategory: { isActive: true } },
      },
      Department: { select: { name: true } },
      EmergencyContact: {
        select: {
          id: true,
          name: true,
          relationship: true,
          phone: true,
          email: true,
        },
      },
      User: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          profileImageUrl: true,
          JobRole: { select: { name: true } },
          Department_User_departmentIdToDepartment: { select: { name: true } },
          User: {
            select: { firstName: true, lastName: true },
          },
          PermissionProfile: {
            select: {
              id: true,
              name: true,
              description: true,
              builtIn: true,
            },
          },
        },
      },
    },
  });

  if (!employee) {
    return <div className="p-6">Employee not found.</div>;
  }
  const isAdminOrManager = isAdminOrManagerHelper(session);
  const isAdmin = isAdminHelper(session);
  const userRole = session?.user?.role ?? null;
  const isEmployee = userRole === "EMPLOYEE";
  const canEditEntitlements =
    userRole === "ADMIN" || userRole === "MANAGER" || userRole === "SUPER_ADMIN";
  const canSeeBankPayrollOverview = Boolean(isAdmin || isEmployee);

  const employeeName = `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim();

  // Generate a signed URL for the profile image if a path is stored
  const signedProfileUrl = employee.User.profileImageUrl
    ? await getDownloadUrl(employee.User.profileImageUrl)
    : null;

  const now = new Date();
  const startDate = employee.startDate ? new Date(employee.startDate) : null;
  const formattedStartDate = startDate ? format(startDate, "MMM d, yyyy") : "Not provided";
  const tenureDisplay = startDate ? formatTenure(startDate, now) : null;
  const nextAnniversary = startDate ? computeNextAnniversary(startDate, now) : null;
  const nextAnniversaryDisplay =
    nextAnniversary ? `${format(nextAnniversary, "MMM d, yyyy")} (in ${formatDistanceStrict(now, nextAnniversary)})` : null;
  const systemJoinedDisplay = format(employee.User.createdAt, "MMM d, yyyy");
  const totalLeaveBalance = employee.LeaveEntitlement.length
    ? employee.LeaveEntitlement.reduce((acc: number, entitlement: any) => {
      const remaining = (entitlement.totalDays ?? 0) - (entitlement.usedDays ?? 0);
      return acc + remaining;
    }, 0)
    : null;

  const salaryAmount = employee.salaryAmount ? Number(employee.salaryAmount) : null;
  const hourlyRate = employee.hourlyRate ? Number(employee.hourlyRate) : null;
  const currencyFormatter = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  });
  const kiwiSaverStatus =
    employee.kiwiSaverEnrolled === null || employee.kiwiSaverEnrolled === undefined
      ? "Not provided"
      : employee.kiwiSaverEnrolled
        ? `Enrolled${employee.kiwiSaverContribution !== null && employee.kiwiSaverContribution !== undefined ? ` (${employee.kiwiSaverContribution}% contribution)` : ""}`
        : "Not enrolled";

  const insights = [
    {
      label: "Length of service",
      value: tenureDisplay ?? "Add a start date to calculate tenure",
    },
    {
      label: "Next anniversary",
      value: nextAnniversaryDisplay ?? "Add a start date to unlock this insight",
    },
    {
      label: "In system since",
      value: systemJoinedDisplay,
    },
    {
      label: "Total leave balance",
      value:
        totalLeaveBalance !== null
          ? `${totalLeaveBalance} day${totalLeaveBalance === 1 ? "" : "s"} remaining`
          : "No leave data yet",
    },
  ];

  return (
    <PageShell
      title={`${employeeName} - Overview`}
      description="Employee overview and key information"
      icon={<User className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Overview", isCurrentPage: true },
        ],
      }}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <ProfileAvatarUploader
            userId={employee.userId}
            name={employeeName}
            initialUrl={signedProfileUrl}
            initialPath={employee.User.profileImageUrl}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Summary cards */}
          <Link
            href={`/employees/${employee.id}/personal-information`}
            className="group block focus:outline-none"
            aria-label="Manage contact info"
          >
            <Card
              hoverable
              className="group-focus-visible:ring-2 group-focus-visible:ring-primary/50"
            >
              <div className="border-b p-4">
                <h2 className="text-lg font-semibold">Contact Info</h2>
              </div>
              <div className="p-4 space-y-1 text-sm">
                <p><strong>Email:</strong> {employee.User.email}</p>
                <p><strong>Phone:</strong> {employee.User.phone || "N/A"}</p>
              </div>
            </Card>
          </Link>

          <Card>
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">Insights</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="space-y-2">
                {insights.map((insight) => (
                  <p key={insight.label}>
                    <strong>{insight.label}:</strong> {insight.value}
                  </p>
                ))}
              </div>
            </div>
          </Card>

          <Link
            href={`/employees/${employee.id}/bank-payroll`}
            className="group block focus:outline-none"
            aria-label="Manage bank and payroll"
          >
            <Card
              hoverable
              className="group-focus-visible:ring-2 group-focus-visible:ring-primary/50"
            >
              <div className="border-b p-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Bank & Payroll</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Who can see bank details"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Bank details are visible to the employee and admins. Managers see an access restricted view for extra privacy.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="p-4 space-y-2 text-sm">
                {canSeeBankPayrollOverview ? (
                  <div className="space-y-1">
                    <p>
                      <strong>Bank account:</strong> {employee.bankAccountNumber || "Not provided"}
                    </p>
                    <p>
                      <strong>IRD number:</strong> {employee.irdNumber || "Not provided"}
                    </p>
                    <p>
                      <strong>KiwiSaver contribution:</strong>{" "}
                      {employee.kiwiSaverContribution !== null && employee.kiwiSaverContribution !== undefined
                        ? `${employee.kiwiSaverContribution}%`
                        : "Not provided"}
                    </p>
                    {isAdmin && (
                      <>
                        <p>
                          <strong>Salary:</strong> {salaryAmount !== null ? currencyFormatter.format(salaryAmount) : "Not provided"}
                        </p>
                        <p>
                          <strong>Hourly rate:</strong> {hourlyRate !== null ? currencyFormatter.format(hourlyRate) : "Not provided"}
                        </p>
                        <p>
                          <strong>KiwiSaver:</strong> {kiwiSaverStatus}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <p>
                    <strong>Access restricted:</strong> Contact an administrator.
                  </p>
                )}
              </div>
            </Card>
          </Link>

          <Link
            href={`/employees/${employee.id}/emergency-contacts`}
            className="group block focus:outline-none"
            aria-label="Manage emergency contacts"
          >
            <Card
              hoverable
              className="group-focus-visible:ring-2 group-focus-visible:ring-primary/50"
            >
              <div className="border-b p-4">
                <h2 className="text-lg font-semibold">Emergency Contacts</h2>
              </div>
              <div className="p-4 space-y-2 text-sm">
                {employee.EmergencyContact.length ? (
                  <div className="space-y-2">
                    {employee.EmergencyContact.map((contact) => (
                      <div key={contact.id} className="space-y-0.5">
                        <p>
                          <strong>{contact.name}</strong>
                          {contact.relationship ? ` • ${contact.relationship}` : ""}
                        </p>
                        {contact.phone ? <p>Phone: {contact.phone}</p> : null}
                        {contact.email ? <p>Email: {contact.email}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No emergency contacts recorded.</p>
                )}
              </div>
            </Card>
          </Link>

          <Link
            href={`/employees/${employee.id}/employment-details`}
            className="group block focus:outline-none"
            aria-label="Manage employment details"
          >
            <Card
              hoverable
              className="group-focus-visible:ring-2 group-focus-visible:ring-primary/50"
            >
              <div className="border-b p-4">
                <h2 className="text-lg font-semibold">Employment Details</h2>
              </div>
              <div className="p-4 space-y-1 text-sm">
                <p><strong>Start date:</strong> {formattedStartDate}</p>
                <p><strong>Status:</strong> {employee.isActive ? "Active" : "Inactive"}</p>
                <p>
                  <strong>Department:</strong>{" "}
                  {employee.Department?.name || employee.User.Department_User_departmentIdToDepartment?.name || "N/A"}
                </p>
                <p>
                  <strong>Manager:</strong>{" "}
                  {employee.User.User
                    ? `${employee.User.User.firstName ?? ""} ${employee.User.User.lastName ?? ""}`.trim() || "N/A"
                    : "N/A"}
                </p>
                <p>
                  <strong>Location:</strong> {employee.siteLocation || "N/A"}
                </p>
              </div>
            </Card>
          </Link>

          {/* Leave Balances + Leave Booking */}
          <Card>
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">Leave Balances</h2>
            </div>
            <div className="p-4 space-y-4">
              {(() => {
                const leaveEntitlementsForPanel = employee.LeaveEntitlement.map((e: any) => ({
                  ...e,
                  eventCategory: {
                    id: e.EventCategory.id,
                    name: e.EventCategory.name,
                    color: e.EventCategory.color,
                  },
                }));
                return (
                  <LeaveBalancePanel
                    leaveEntitlements={leaveEntitlementsForPanel}
                    employeeId={employee.id}
                    isAdminOrManager={canEditEntitlements}
                  />
                );
              })()}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
