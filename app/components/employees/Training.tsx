"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { GraduationCap } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import Button from "@/components/ui/Button";

interface TrainingRecord {
  id: string;
  dateCompleted: string;
  expiryDate: string | null;
  document: {
    id: string;
    name: string;
    url: string;
  } | null;
  course: {
    id: string;
    name: string;
  } | null;
  provider: {
    id: string;
    name: string;
  } | null;
}

export default function Training({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>("Employee");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsRes, employeeRes] = await Promise.all([
          fetch(`/api/training-records/list?employeeId=${employeeId}`),
          fetch(`/api/employees/${employeeId}`),
        ]);

        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          setRecords(recordsData);
        }

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Error fetching training data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) fetchData();
  }, [employeeId]);

  if (loading) {
    return (
      <PageShell
        title="Training Records"
        description="Employee training and certification records"
        icon={<GraduationCap className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Training", isCurrentPage: true },
          ],
        }}
      >
        <PageLoader text="Loading training records..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Training Records"
      description="Employee training and certification records"
      icon={<GraduationCap className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Training", isCurrentPage: true },
        ],
      }}
      action={
        <Button
          onClick={() => router.push(`/employees/${employeeId}/training/add`)}
        >
          Add Training
        </Button>
      }
    >
      {records.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No training records found</p>
          <p className="text-muted-foreground mb-6">No training records have been added for this employee yet.</p>
          <Button
            onClick={() => router.push(`/employees/${employeeId}/training/add`)}
          >
            Add First Training Record
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Date Completed</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={record.id}
                onClick={() =>
                  router.push(`/employees/${employeeId}/training/${record.id}`)
                }
                className="cursor-pointer hover:bg-muted transition"
              >
                <TableCell>{record.course?.name ?? "—"}</TableCell>
                <TableCell>{record.provider?.name ?? "—"}</TableCell>
                <TableCell>
                  {new Date(record.dateCompleted).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {record.expiryDate
                    ? new Date(record.expiryDate).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  {record.document ? (
                    <a
                      href={record.document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {record.document.name}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageShell>
  );
}
