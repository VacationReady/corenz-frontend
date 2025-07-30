'use client';

import { useParams } from 'next/navigation';
import Training from '@/components/employee/Training'; // Adjust import path if needed

export default function TrainingPage() {
  const params = useParams();
  const employeeIdRaw = params?.id ?? '';
  const employeeId = Array.isArray(employeeIdRaw) ? employeeIdRaw[0] : employeeIdRaw;

  return <Training employeeId={employeeId} />;
}
