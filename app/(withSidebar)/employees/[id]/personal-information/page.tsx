import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import PersonalInfoSaveButton from "@/components/employees/PersonalInfoSaveButton";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";

interface PageProps {
  params: { id: string };
}

export default async function PersonalInformationPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      user: {
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
  const genderOptions: Array<{ id: string; label: string }> = [];

  if (!employee?.user) {
    return <div className="p-6">Employee not found.</div>;
  }

  const user = employee.user;

  const canEdit = Boolean(
    session?.user &&
      session.user.role === "ADMIN" &&
      session.user.companyId === employee.user.companyId,
  );
  const showManageGender = canEdit;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <HeaderWithHistory 
        title="Personal information" 
        employeeId={params.id} 
        section="personal-info" 
      />

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Basic details</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <form
            action={`/api/employees/${params.id}/personal-info`}
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
            {/* Date of birth moved to Demographic page */}
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
            {/* Emergency contacts moved to dedicated screen */}
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

      <Card>
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Other</h2>
        </div>
        <div className="p-4 space-y-2 text-sm text-muted-foreground">
          <p>Additional suggested fields:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Emergency contact (name, relationship, phone)</li>
            <li>Home address split into Street, City, Postcode, Country</li>
            <li>
              National ID (e.g., NI number), Gender/Pronouns (if required)
            </li>
          </ul>
          <p className="mt-2">
            I can add these as editable fields with an update API if you'd like.
          </p>
        </div>
      </Card>

      {canEdit && <PersonalInfoSaveButton employeeId={params.id} />}
      {/* Portal handled in client-only ManageGenderInline */}
    </div>
  );
}
