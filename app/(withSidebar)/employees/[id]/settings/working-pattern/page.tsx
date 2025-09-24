// app/employees/[id]/settings/working-pattern/page.tsx
import WorkingPatternAssignment from "@/components/WorkingPatternAssignment";

export default async function WorkingPatternPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return <WorkingPatternAssignment employeeId={id} />;
}
