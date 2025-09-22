"use client";

import { useTenantBranding } from "@/components/TenantBrandingProvider";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { branding } = useTenantBranding();
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
