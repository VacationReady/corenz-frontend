import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import PersonalInfoSaveButton from "@/components/employees/PersonalInfoSaveButton";
import GenderSelectWithManage from "@/components/shared/GenderSelectWithManage";

interface PageProps {
  params: { id: string };
}

export default async function DemographicPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      User: {
        select: {
          id: true,
          dateOfBirth: true,
          genderOptionId: true,
          residencyStatus: true,
          companyId: true,
        },
      },
    },
  });

  if (!employee?.User) {
    return <div className="p-6">Employee not found.</div>;
  }

  const genderOptions = employee?.User?.companyId
    ? await prisma.genderOption.findMany({
        where: { companyId: employee.User.companyId as string, active: true },
        orderBy: { order: "asc" },
        select: { id: true, label: true },
      })
    : [];

  const user = employee.User;
  const canEdit = Boolean(
    session?.user &&
      session.user.role === "ADMIN" &&
      session.user.companyId === employee.User.companyId,
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Demographic</h1>

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">DOB, Gender, Residency</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <form
            action={`/api/employees/${params.id}/personal-info`}
            method="PATCH"
            className="contents"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Date of birth</label>
              <Input
                name="dateOfBirth"
                type="date"
                defaultValue={
                  user.dateOfBirth
                    ? new Date(user.dateOfBirth).toISOString().substring(0, 10)
                    : ""
                }
                readOnly={!canEdit}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Gender</label>
              {canEdit ? (
                <GenderSelectWithManage
                  value={user.genderOptionId ?? undefined}
                  options={genderOptions}
                />
              ) : (
                <Input
                  readOnly
                  defaultValue={
                    genderOptions.find((g: any) => g.id === user.genderOptionId)?.label || ""
                  }
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Residency / Visa status</label>
              <Input
                name="residencyStatus"
                defaultValue={user.residencyStatus ?? ""}
                readOnly={!canEdit}
              />
            </div>
          </form>
        </div>
      </Card>

      {canEdit && <PersonalInfoSaveButton employeeId={params.id} />}
    </div>
  );
}


