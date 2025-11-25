import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  isAdminOrManager as isAdminOrManagerHelper,
  isAdmin as isAdminHelper,
} from "@/lib/roles";
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
import OverviewClient from "./OverviewClient";

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
    nextAnniversary ? `${format(nextAnniversary, "MMM d, yyyy")}` : null;
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
  
  // Pre-format currency values since Intl.NumberFormat can't be passed to client components
  const formattedSalary = salaryAmount !== null ? currencyFormatter.format(salaryAmount) : null;
  const formattedHourlyRate = hourlyRate !== null ? currencyFormatter.format(hourlyRate) : null;
  
  const kiwiSaverStatus =
    employee.kiwiSaverEnrolled === null || employee.kiwiSaverEnrolled === undefined
      ? "Not provided"
      : employee.kiwiSaverEnrolled
        ? `Enrolled${employee.kiwiSaverContribution !== null && employee.kiwiSaverContribution !== undefined ? ` (${employee.kiwiSaverContribution}% contribution)` : ""}`
        : "Not enrolled";

  const insights = [
    {
      label: "Length of Service",
      value: tenureDisplay ?? "Not set",
    },
    {
      label: "Next Anniversary",
      value: nextAnniversaryDisplay ?? "Not set",
    },
    {
      label: "In System Since",
      value: systemJoinedDisplay,
    },
    {
      label: "Leave Balance",
      value:
        totalLeaveBalance !== null
          ? `${totalLeaveBalance} days`
          : "No data",
    },
  ];

  const managerName = employee.User.User
    ? `${employee.User.User.firstName ?? ""} ${employee.User.User.lastName ?? ""}`.trim() || null
    : null;

  const departmentName = employee.Department?.name || employee.User.Department_User_departmentIdToDepartment?.name || null;

  // Prepare leave entitlements for the panel
  const leaveEntitlementsForPanel = employee.LeaveEntitlement.map((e: any) => ({
    ...e,
    eventCategory: {
      id: e.EventCategory.id,
      name: e.EventCategory.name,
      color: e.EventCategory.color,
    },
  }));

  return (
    <OverviewClient
      employeeId={employeeId}
      employeeName={employeeName}
      email={employee.User.email}
      phoneNumber={employee.User.phone}
      startDate={formattedStartDate}
      isActive={employee.isActive}
      departmentName={departmentName}
      managerName={managerName}
      location={employee.siteLocation}
      bankAccountNumber={employee.bankAccountNumber}
      irdNumber={employee.irdNumber}
      kiwiSaverContribution={employee.kiwiSaverContribution}
      formattedSalary={formattedSalary}
      formattedHourlyRate={formattedHourlyRate}
      kiwiSaverStatus={kiwiSaverStatus}
      emergencyContacts={employee.EmergencyContact}
      insights={insights}
      canSeeBankPayrollOverview={canSeeBankPayrollOverview}
      isAdmin={isAdmin}
      profileAvatar={
        <ProfileAvatarUploader
          userId={employee.userId}
          name={employeeName}
          initialUrl={signedProfileUrl}
          initialPath={employee.User.profileImageUrl}
        />
      }
      leaveBalanceComponent={
        <LeaveBalancePanel
          leaveEntitlements={leaveEntitlementsForPanel}
          employeeId={employee.id}
          isAdminOrManager={canEditEntitlements}
        />
      }
    />
  );
}
