/**
 * Employees Directory - Server Component
 * 
 * Next.js 15 server component that fetches initial employee data server-side.
 * This provides fast initial page loads and SEO benefits.
 * 
 * Architecture:
 * - Server: Fetches first page of employees (50), departments, and job roles
 * - Client: Handles interactivity (filters, modals, pagination, mutations)
 * 
 * Related:
 * - Prompt 6: Paginated /api/employees endpoint
 * - Prompt 7: Client-side pagination implementation
 * - Prompt 8: Server-first architecture refactor
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import EmployeesPageClient from "./EmployeesClient";

export const dynamic = "force-dynamic";

/**
 * Fetch initial employee data server-side
 * Uses the paginated API endpoint for consistency
 */
async function getInitialData(status: "active" | "archived" | "all" = "active") {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  try {
    // Fetch first page of employees (50)
    const employeesRes = await fetch(
      `${baseUrl}/api/employees?status=${status}&limit=50`,
      {
        headers: {
          cookie: `next-auth.session-token=${session.user.id}`,
        },
        cache: "no-store",
      }
    );

    // Fetch departments and job roles in parallel
    const [deptsRes, rolesRes] = await Promise.all([
      fetch(`${baseUrl}/api/departments`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/job-roles`, { cache: "no-store" }),
    ]);

    const employeesData = employeesRes.ok ? await employeesRes.json() : { data: [], pagination: { cursor: null, hasMore: false } };
    const departments = deptsRes.ok ? await deptsRes.json() : [];
    const jobRoles = rolesRes.ok ? await rolesRes.json() : [];

    return {
      initialEmployees: Array.isArray(employeesData) ? employeesData : (employeesData.data || []),
      initialPagination: employeesData.pagination || { cursor: null, hasMore: false, limit: 50 },
      departments: Array.isArray(departments) ? departments : (departments.departments || []),
      jobRoles: Array.isArray(jobRoles) ? jobRoles : (jobRoles.jobRoles || []),
    };
  } catch (error) {
    console.error("[EmployeesPage] Failed to fetch initial data:", error);
    return {
      initialEmployees: [],
      initialPagination: { cursor: null, hasMore: false, limit: 50 },
      departments: [],
      jobRoles: [],
    };
  }
}

export default async function EmployeesPage() {
  const data = await getInitialData("active");
  
  return (
    <EmployeesPageClient
      initialEmployees={data.initialEmployees}
      initialPagination={data.initialPagination}
      departments={data.departments}
      jobRoles={data.jobRoles}
    />
  );
}
