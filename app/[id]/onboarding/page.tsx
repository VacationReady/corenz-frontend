import EmployeeOnboardingPage from "@/components/onboarding/EmployeeOnboardingPage";

export default async function Page(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  // This is the EMPLOYEE doing their own onboarding (canComplete = true)
  return <EmployeeOnboardingPage employeeId={id} canComplete={true} />;
}
