import EmergencyContactsClient from "./EmergencyContactsClient";

export default async function EmergencyContactsPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return <EmergencyContactsClient employeeId={id} />;
}


