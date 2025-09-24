import EmployeeOnboardingPage from "@/components/onboarding/EmployeeOnboardingPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // This is the EMPLOYEE doing their own onboarding (canComplete = true)
  return <EmployeeOnboardingPage employeeId={id} canComplete={true} />;
}
