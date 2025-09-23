import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

import TenantsPageClient from "./TenantsPageClient";

const MAIN_PRODUCTION_COMPANY_ID =
  process.env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID;

export default async function TenantsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const homeCompanyId =
    session.user.homeCompanyId ?? session.user.companyId ?? null;

  if (
    session.user.role !== "SUPER_ADMIN" ||
    !session.user.canManageTenants ||
    !homeCompanyId
  ) {
    if (session.user.role === "ADMIN") {
      redirect("/dashboard/admin");
    }

    if (session.user.role === "MANAGER") {
      redirect("/dashboard/manager");
    }

    redirect("/dashboard");
  }

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });

  const ordered = companies.slice().sort((a, b) => {
    if (a.id === homeCompanyId) return -1;
    if (b.id === homeCompanyId) return 1;
    return a.name.localeCompare(b.name);
  });

  const serialised = ordered.map((company) => ({
    id: company.id,
    name: company.name,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  }));

  return (
    <TenantsPageClient
      initialTenants={serialised}
      homeCompanyId={homeCompanyId}
      mainCompanyId={MAIN_PRODUCTION_COMPANY_ID ?? null}
    />
  );
}
