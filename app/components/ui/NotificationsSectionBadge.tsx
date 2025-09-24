"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";

interface ResolveResponse {
  section: string;
  notifyAdmin: boolean;
  notifyManager: boolean;
  notifyEmployee: boolean;
}

function deriveSectionFromPath(pathname: string): string | null {
  // Expecting /employees/:id/:slug ... or nested
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("employees");
  if (idx === -1) return null;
  const slug = parts[idx + 2];
  if (!slug) return null;

  // Map known slugs to section ids as per BASE_TRANSACTIONAL_SECTIONS
  const map: Record<string, string> = {
    "personal-information": "personal-info",
    "bank-payroll": "bank-payroll",
    "employment-details": "employment-details",
    "emergency-contacts": "emergency-contacts",
    "driver-licenses": "driver-licenses",
    "employment-checks": "employment-checks",
    "training": "training",
  };

  if (map[slug]) return map[slug];

  // Unknown slug → treat as custom form; on the server we route form pages via \[slug]\n
  // The backend resolves forms via `forms:${id}`; since we don't have the form id
  // at this moment, fall back to base "forms" preference so admins still see a signal.
  return "forms";
}

export default function NotificationsSectionBadge({ employeeId }: { employeeId: string }) {
  const pathname = usePathname() || "";
  const [loading, setLoading] = useState(false);
  const [pref, setPref] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const section = useMemo(() => deriveSectionFromPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;
    const fetchPref = async () => {
      if (!section) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/transactional-notifications/resolve?section=${encodeURIComponent(section)}`);
        if (!res.ok) throw new Error("Failed to resolve");
        const data: ResolveResponse = await res.json();
        if (!cancelled) setPref(data);
      } catch (e) {
        if (!cancelled) setError("Could not load notifications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPref();
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (!section) return null;

  return (
    <div className="flex items-start gap-2 text-xs text-blue-900">
      <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
      <div className="flex-1">
        {loading ? (
          <span>Loading notification rule…</span>
        ) : error ? (
          <span>{error}</span>
        ) : pref ? (
          <span>
            Notifications: 
            <span className="ml-1">
              {pref.notifyAdmin ? "Admin" : null}
              {pref.notifyManager ? `${pref.notifyAdmin ? ", " : ""}Manager` : null}
              {pref.notifyEmployee ? `${pref.notifyAdmin || pref.notifyManager ? ", " : ""}Employee` : null}
              {!pref.notifyAdmin && !pref.notifyManager && !pref.notifyEmployee ? "None" : null}
            </span>
          </span>
        ) : (
          <span>No rule</span>
        )}
        <div className="mt-1">
          <Link href="/settings/workflows/notifications" className="text-blue-700 hover:underline">Configure</Link>
        </div>
      </div>
    </div>
  );
}


