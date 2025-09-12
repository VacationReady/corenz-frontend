// app/employees/[id]/settings/working-pattern/page.tsx
import WorkingPatternAssignment from "@/components/WorkingPatternAssignment";

export default function WorkingPatternPage({
  params,
}: {
  params: { id: string };
}) {
  return <WorkingPatternAssignment employeeId={params.id} />;
}
