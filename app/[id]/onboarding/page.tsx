import EmployeeOnboardingPageEnhanced from "@/components/onboarding/EmployeeOnboardingPageEnhanced";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // This is the EMPLOYEE doing their own onboarding (canComplete = true)
  return <EmployeeOnboardingPageEnhanced employeeId={id} canComplete={true} />;
}
