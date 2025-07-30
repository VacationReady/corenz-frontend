'use client';

import { useParams } from 'next/navigation';
import EmploymentChecks from '@/components/employees/EmploymentChecks'; // Adjust import path if needed

export default function EmploymentChecksPage() {
  const params = useParams();
  const employeeIdRaw = params?.id ?? '';
  const employeeId = Array.isArray(employeeIdRaw) ? employeeIdRaw[0] : employeeIdRaw;

  return <EmploymentChecks employeeId={employeeId} />;
}
