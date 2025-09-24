import EmploymentDetailsClient from "./EmploymentDetailsClient";

export default async function EmploymentDetailsPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return <EmploymentDetailsClient employeeId={id} />;
}


