import EmployeeOnboardingPageEnhanced from "@/components/onboarding/EmployeeOnboardingPageEnhanced";

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  // This is the EMPLOYEE doing their own onboarding (canComplete = true)
  return <EmployeeOnboardingPageEnhanced employeeId={id} canComplete={true} />;
}
