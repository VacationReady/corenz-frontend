"use client";

import { useParams } from "next/navigation";
import BankPayrollClient from "./BankPayrollClient";

export default function BankPayrollPage() {
  const { id } = useParams() as { id: string };
  return <BankPayrollClient employeeId={id} />;
}
