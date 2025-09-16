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
      createdAt: "desc",
    },
  });

  // Get a sample employee for testing
  const sampleEmployee = await prisma.employee.findFirst({
    where: {
      companyId: session.user.companyId,
    },
    include: {
      User: {
        include: {
          JobRole: true,
          Department_User_departmentIdToDepartment: true,
        },
      },
    },
  });

  // Also check for users without employee records
  const usersWithoutEmployees = await prisma.user.findMany({
    where: {
      companyId: session.user.companyId,
      Employee: null, // Users who don't have an employee record
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  // Get total user count for debugging
  const totalUsers = await prisma.user.count({
    where: {
      companyId: session.user.companyId,
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Forms Debug Page</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Database Debug Info</h2>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <p>
              <strong>Total Users in Company:</strong> {totalUsers}
            </p>
            <p>
              <strong>Users without Employee records:</strong>{" "}
              {usersWithoutEmployees.length}
            </p>
          </div>

          {usersWithoutEmployees.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-semibold mb-2">
                Users without Employee records:
              </h3>
              {usersWithoutEmployees.map((user: any) => (
                <div key={user.id} className="text-sm">
                  • {user.firstName} {user.lastName} ({user.email}) - Role:{" "}
                  {user.role}
                </div>
              ))}
            </div>
          )}

          <h3 className="text-lg font-semibold">Sample Employee Info</h3>
          {sampleEmployee ? (
            <div className="bg-gray-100 p-4 rounded">
              <p>
                <strong>ID:</strong> {sampleEmployee.id}
              </p>
              <p>
                <strong>Name:</strong> {sampleEmployee.User?.name}
              </p>
              <p>
                <strong>Role:</strong> {sampleEmployee.User?.role}
              </p>
              <p>
                <strong>Department:</strong>{" "}
                {sampleEmployee.User?.Department_User_departmentIdToDepartment?.name || "None"}
              </p>
              <p>
                <strong>Job Role:</strong>{" "}
                {sampleEmployee.User?.JobRole?.name || "None"}
              </p>
            </div>
          ) : (
            <p>No employees found</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">
          All Forms ({allForms.length})
        </h2>
        {allForms.length === 0 ? (
          <p>No forms found</p>
        ) : (
          <div className="space-y-4">
            {allForms.map((form: any) => (
              <div key={form.id} className="border p-4 rounded">
                <h3 className="font-semibold">{form.name}</h3>
                <p>
                  <strong>Slug:</strong> {form.slug}
                </p>
                <p>
                  <strong>Type:</strong> {form.formType}
                </p>
                <p>
                  <strong>Active:</strong> {form.isActive ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Visible to Roles:</strong>{" "}
                  {JSON.stringify(form.visibleToRoles)}
                </p>
                <p>
                  <strong>Visible to Departments:</strong>{" "}
                  {JSON.stringify(form.visibleToDepartments)}
                </p>
                <p>
                  <strong>Visible to Job Roles:</strong>{" "}
                  {JSON.stringify(form.visibleToJobRoles)}
                </p>
                <p>
                  <strong>Created:</strong> {form.createdAt.toLocaleString()}
                </p>

                {sampleEmployee && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p>
                      <strong>Would show to sample employee?</strong>
                    </p>
                    <p>
                      Role match:{" "}
                      {form.visibleToRoles.includes(
                        sampleEmployee.User?.role || "EMPLOYEE",
                      )
                        ? "Yes"
                        : "No"}
                    </p>
                    <p>
                      Dept match:{" "}
                      {form.visibleToDepartments.length === 0 ||
                      (sampleEmployee.User?.Department_User_departmentIdToDepartment?.name &&
                        form.visibleToDepartments.includes(
                          sampleEmployee.User.Department_User_departmentIdToDepartment.name,
                        ))
                        ? "Yes"
                        : "No"}
                    </p>
                    <p>
                      Job role match:{" "}
                      {form.visibleToJobRoles.length === 0 ||
                      (sampleEmployee.User?.JobRole?.name &&
                        form.visibleToJobRoles.includes(
                          sampleEmployee.User.JobRole.name,
                        ))
                        ? "Yes"
                        : "No"}
                    </p>
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
