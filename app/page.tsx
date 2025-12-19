import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { normalizeTenantBranding, extractBrandingFromSession } from "@/lib/tenant-branding";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

async function getTenantBranding(session: Session | null) {
  
  // Try to extract branding from session first
  if (session) {
    const sessionBranding = extractBrandingFromSession(session);
    if (sessionBranding) {
      return sessionBranding;
    }
  }
  
  // Fallback: fetch from database if user is authenticated
  if (session?.user?.companyId) {
    try {
      const [company, config] = await Promise.all([
        prisma.company.findUnique({
          where: { id: session.user.companyId },
          select: { id: true, name: true },
        }),
        prisma.brandingConfiguration.findUnique({
          where: { companyId: session.user.companyId },
          select: {
            logoUrl: true,
            accentColor: true,
            emailFooterText: true,
          },
        }),
      ]);

      if (company) {
        return normalizeTenantBranding({
          name: company.name,
          shortName: company.name,
          logoUrl: config?.logoUrl ?? null,
          squareLogoUrl: config?.logoUrl ?? null,
          accentColor: config?.accentColor ?? null,
          tagline: config?.emailFooterText ?? null,
        });
      }
    } catch (error) {
      console.error("[home] Failed to load tenant branding:", error);
    }
  }
  
  // Default branding
  return normalizeTenantBranding(null);
}

export default async function HomePage() {
  const session = (await auth()) as Session | null;

  if (session?.user) {
    redirect("/dashboard");
  }

  const branding = await getTenantBranding(session);
  const brandName = branding.shortName || branding.name;

  return (
    <div className="h-screen flex items-center justify-center text-center">
      <div>
        <h1 className="text-3xl font-bold mb-4">Welcome to {brandName}</h1>
        <p className="text-gray-600">
          Please{" "}
          <a href="/login" className="text-blue-600 underline">
            log in
          </a>{" "}
          to access your {brandName} workspace.
        </p>
      </div>
    </div>
  );
}
