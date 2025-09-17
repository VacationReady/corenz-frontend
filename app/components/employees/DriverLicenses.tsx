"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import HistoryButton from "@/components/audit/HistoryButton";

interface DriverLicence {
  id: string;
  type: string;
  licenceNumber: string;
  issueDate: string;
  expiryDate: string;
  document: {
    id: string;
    name: string;
    url: string;
  } | null;
}

export default function DriverLicenses({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [licences, setLicences] = useState<DriverLicence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLicences = async () => {
      try {
        const res = await fetch(
          `/api/driver-licenses/list?employeeId=${employeeId}`,
        );
        const data = await res.json();
        setLicences(data);
      } catch (error) {
        console.error("Error fetching driver licences:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchLicences();
    }
  }, [employeeId]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Driver Licences</h1>
        <div className="flex items-center gap-2">
          <HistoryButton employeeId={employeeId} section="driver-licenses" />
          <Button
          onClick={() =>
            router.push(`/employees/${employeeId}/driver-licenses/add`)
          }
        >
          Add Licence
        </Button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : licences.length === 0 ? (
        <p>No driver licences found for this employee.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Licence Number</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licences.map((licence) => (
              <TableRow key={licence.id}>
                <TableCell>{licence.type}</TableCell>
                <TableCell>{licence.licenceNumber}</TableCell>
                <TableCell>
                  {new Date(licence.issueDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(licence.expiryDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {licence.document ? (
                    <a
                      href={licence.document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {licence.document.name}
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
    </div>
  );
}
