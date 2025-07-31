import EmployeeOnboardingPage from '@/components/onboarding/EmployeeOnboardingPage';

export default function Page({ params }: { params: { id: string } }) {
  // This is the EMPLOYEE doing their own onboarding (canComplete = true)
  return <EmployeeOnboardingPage userId={params.id} canComplete={true} />;
}
