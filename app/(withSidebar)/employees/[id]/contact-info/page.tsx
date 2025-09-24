import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import PersonalInfoSaveButton from "@/components/employees/PersonalInfoSaveButton";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";

export default async function ContactInfoPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      User: {
        select: {
          id: true,
          email: true,
          phone: true,
          addressStreet: true,
          addressCity: true,
          addressPostcode: true,
          addressCountry: true,
          companyId: true,
        },
      },
    },
  });

  if (!employee?.User) {
    return <div className="p-6">Employee not found.</div>;
  }

  const user = employee.User;
  const canEdit = Boolean(
    session?.user &&
      (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") &&
      session.user.companyId === employee.User.companyId,
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <HeaderWithHistory
        title="Contact information"
        employeeId={id}
        section="personal-info"
      />

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Contact details</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <form
            action={`/api/employees/${id}/personal-info`}
            method="PATCH"
            className="contents"
          >
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
                <label className="block text-sm font-medium mb-1">Postcode</label>
                <Input
                  name="addressPostcode"
                  defaultValue={user.addressPostcode ?? ""}
                  readOnly={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Input
                  name="addressCountry"
                  defaultValue={user.addressCountry ?? ""}
                  readOnly={!canEdit}
                />
              </div>
            </div>
          </form>
        </div>
      </Card>

      {canEdit && <PersonalInfoSaveButton employeeId={id} />}
    </div>
  );
}


