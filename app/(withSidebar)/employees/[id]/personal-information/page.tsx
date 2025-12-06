import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import PersonalInformationClient from "./PersonalInformationClient";

export default async function PersonalInformationPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
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

  return (
    <PersonalInformationClient
      employeeId={id}
      user={user}
      genderOptions={genderOptions}
      canEdit={canEdit}
    />
  );
}
