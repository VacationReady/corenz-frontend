import BankPayrollClient from "./BankPayrollClient";

export default async function BankPayrollPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return <BankPayrollClient employeeId={id} />;
}


