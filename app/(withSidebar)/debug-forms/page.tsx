import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function DebugFormsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.companyId) {
    return <div>Not authenticated</div>;
  }

  // Get all forms for the company
  const allForms = await prisma.form.findMany({
    where: {
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      formType: true,
      isActive: true,
      visibleToRoles: true,
      visibleToDepartments: true,
      visibleToJobRoles: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get a sample employee for testing
  const sampleEmployee = await prisma.employee.findFirst({
    where: {
      companyId: session.user.companyId,
    },
    include: {
      user: {
        include: {
          jobRole: true,
          department: true,
        }
      }
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Forms Debug Page</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Sample Employee Info</h2>
        {sampleEmployee ? (
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>ID:</strong> {sampleEmployee.id}</p>
            <p><strong>Name:</strong> {sampleEmployee.user?.name}</p>
            <p><strong>Role:</strong> {sampleEmployee.user?.role}</p>
            <p><strong>Department:</strong> {sampleEmployee.user?.department?.name || 'None'}</p>
            <p><strong>Job Role:</strong> {sampleEmployee.user?.jobRole?.name || 'None'}</p>
          </div>
        ) : (
          <p>No employees found</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">All Forms ({allForms.length})</h2>
        {allForms.length === 0 ? (
          <p>No forms found</p>
        ) : (
          <div className="space-y-4">
            {allForms.map((form) => (
              <div key={form.id} className="border p-4 rounded">
                <h3 className="font-semibold">{form.name}</h3>
                <p><strong>Slug:</strong> {form.slug}</p>
                <p><strong>Type:</strong> {form.formType}</p>
                <p><strong>Active:</strong> {form.isActive ? 'Yes' : 'No'}</p>
                <p><strong>Visible to Roles:</strong> {JSON.stringify(form.visibleToRoles)}</p>
                <p><strong>Visible to Departments:</strong> {JSON.stringify(form.visibleToDepartments)}</p>
                <p><strong>Visible to Job Roles:</strong> {JSON.stringify(form.visibleToJobRoles)}</p>
                <p><strong>Created:</strong> {form.createdAt.toLocaleString()}</p>
                
                {sampleEmployee && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p><strong>Would show to sample employee?</strong></p>
                    <p>Role match: {form.visibleToRoles.includes(sampleEmployee.user?.role || 'EMPLOYEE') ? 'Yes' : 'No'}</p>
                    <p>Dept match: {form.visibleToDepartments.length === 0 || (sampleEmployee.user?.department?.name && form.visibleToDepartments.includes(sampleEmployee.user.department.name)) ? 'Yes' : 'No'}</p>
                    <p>Job role match: {form.visibleToJobRoles.length === 0 || (sampleEmployee.user?.jobRole?.name && form.visibleToJobRoles.includes(sampleEmployee.user.jobRole.name)) ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
