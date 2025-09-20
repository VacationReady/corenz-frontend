import { sendLeaveNotification } from "@/lib/sendLeaveNotification";
import { sendLeaveStatusUpdate } from "@/lib/sendLeaveStatusUpdate";

export async function notifyApproversForStage({
  stage,
  leaveRequest,
  eventCategoryName,
}: {
  stage: {
    id: string;
    name: string | null;
    mode: "SEQUENTIAL" | "FIRST_RESPONDER" | "UNANIMOUS";
    decisions: Array<{
      isActive: boolean;
      approver: { email: string | null; name: string | null };
    }>;
  };
  leaveRequest: {
    Employee: { User: { firstName: string | null; lastName: string | null } };
    startDate: Date | string;
    endDate: Date | string;
  };
  eventCategoryName: string;
}) {
  const subject = `[Action required] ${
    [leaveRequest.Employee.User.firstName, leaveRequest.Employee.User.lastName]
      .filter(Boolean)
      .join(" ") || "Employee"
  } ${eventCategoryName} request – ${stage.name || "Stage"}`;

  const activeApprovers = (stage.decisions || []).filter((d) => d.isActive);
  const uniqueEmails = new Set(
    activeApprovers.map((d) => d.approver?.email).filter(Boolean) as string[],
  );

  await Promise.all(
    Array.from(uniqueEmails).map((email) =>
      sendLeaveNotification({
        to: email,
        subject,
        employeeName:
          [
            leaveRequest.Employee.User.firstName,
            leaveRequest.Employee.User.lastName,
          ]
            .filter(Boolean)
            .join(" ") || "Employee",
        type: eventCategoryName,
        startDate: String(leaveRequest.startDate),
        endDate: String(leaveRequest.endDate),
        status: "PENDING",
      }),
    ),
  );
}

export async function notifyRequesterStatusChange({
  leaveRequest,
  employeeUser,
  status,
  eventCategoryName,
}: {
  leaveRequest: { startDate: Date | string; endDate: Date | string };
  employeeUser: { email: string | null; firstName: string | null };
  status: "APPROVED" | "DECLINED";
  eventCategoryName: string;
}) {
  if (!employeeUser?.email) return;
  await sendLeaveStatusUpdate({
    to: employeeUser.email,
    subject: `Your ${eventCategoryName} request has been ${status.toLowerCase()}`,
    employeeName: employeeUser.firstName || "",
    type: eventCategoryName,
    startDate: String(leaveRequest.startDate),
    endDate: String(leaveRequest.endDate),
    status,
  });
}


