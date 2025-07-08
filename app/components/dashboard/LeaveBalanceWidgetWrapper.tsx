"use client";

import LeaveBalanceWidget from "./LeaveBalanceWidget";

export default function LeaveBalanceWidgetWrapper({ employeeId }: { employeeId: string }) {
  return <LeaveBalanceWidget employeeId={employeeId} />;
}
