import EmployeeOnboardingPage from '@/components/onboarding/EmployeeOnboardingPage';

export default function Page({ params }: { params: { id: string } }) {
  // Admins/managers should NOT be able to complete for the employee, so canComplete = false
  return <EmployeeOnboardingPage employeeId={params.id} canComplete={false} />;
}
