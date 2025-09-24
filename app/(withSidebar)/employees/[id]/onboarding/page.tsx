import EmployeeOnboardingPage from "@/components/onboarding/EmployeeOnboardingPage";

export default async function Page(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  // Admins/managers should NOT be able to complete for the employee, so canComplete = false
  return <EmployeeOnboardingPage employeeId={id} canComplete={false} />;
}
