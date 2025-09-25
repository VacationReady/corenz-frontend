import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import PersonalInfoSaveButton from "@/components/employees/PersonalInfoSaveButton";
import UnsavedChangesGuard from "@/components/ui/UnsavedChangesGuard";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import GenderSelectWithManage from "@/components/shared/GenderSelectWithManage";

export default async function PersonalInformationPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      User: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          profileImageUrl: true,
          companyId: true,
          genderOptionId: true,
          pronouns: true,
          nationalId: true,
          addressStreet: true,
          addressCity: true,
          addressPostcode: true,
          addressCountry: true,
          emergencyContactName: true,
          emergencyContactRelationship: true,
          emergencyContactPhone: true,
        },
      },
    },
  });
  const companyId = employee?.User?.companyId as string | undefined;
  const genderOptions = companyId
    ? await prisma.genderOption.findMany({
        where: { companyId, active: true },
        orderBy: { order: "asc" },
        select: { id: true, label: true },
      })
    : [];

  if (!employee?.User) {
    return <div className="p-6">Employee not found.</div>;
  }

  const user = employee.User;

  const canEdit = Boolean(
    session?.user &&
      (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") &&
      session.user.companyId === employee.User.companyId,
  );
  const showManageGender = canEdit;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <HeaderWithHistory 
        title="Personal information" 
        employeeId={id} 
        section="personal-info" 
      />

      <UnsavedChangesGuard>
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Basic details</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <form
              action={`/api/employees/${id}/personal-info`}
              method="PATCH"
              className="contents"
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  First name
                </label>
                <Input
                  name="firstName"
                  defaultValue={user.firstName ?? ""}
                  readOnly={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last name
                </label>
                <Input
                  name="lastName"
                  defaultValue={user.lastName ?? ""}
                  readOnly={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  readOnly={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  name="phone"
                  defaultValue={user.phone ?? ""}
                  readOnly={!canEdit}
                />
              </div>
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
              <div>
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
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Street</label>
                  <Input
                    name="addressStreet"
                    defaultValue={user.addressStreet ?? ""}
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    name="addressCity"
                    defaultValue={user.addressCity ?? ""}
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Postcode
                  </label>
                  <Input
                    name="addressPostcode"
                    defaultValue={user.addressPostcode ?? ""}
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Country
                  </label>
                  <Input
                    name="addressCountry"
                    defaultValue={user.addressCountry ?? ""}
                    readOnly={!canEdit}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    National ID
                  </label>
                  <Input
                    name="nationalId"
                    defaultValue={user.nationalId ?? ""}
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pronouns
                  </label>
                  <Input
                    name="pronouns"
                    defaultValue={user.pronouns ?? ""}
                    readOnly={!canEdit}
                  />
                </div>
                {/* Gender moved to Demographic page */}
              </div>
            </form>
          </div>
        </Card>


        {canEdit && (
          <PersonalInfoSaveButton employeeId={id} section="personal-info" />
        )}
      </UnsavedChangesGuard>
      {/* Portal handled in client-only ManageGenderInline */}
    </div>
  );
}
