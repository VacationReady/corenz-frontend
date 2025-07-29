import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";

interface Acknowledgement {
  name: string;
  email: string;
  acknowledgedAt?: string;
  department?: string | null; // ✅ Added for company docs
  jobRole?: string | null;    // ✅ Added for company docs
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentName: string | null;
  isEmployeeDocument?: boolean; // ✅ NEW FLAG
}

export default function ViewAcknowledgementsModal({ isOpen, onClose, documentId, documentName, isEmployeeDocument = false }: Props) {
  const [acknowledged, setAcknowledged] = useState<Acknowledgement[]>([]);
  const [pending, setPending] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (documentId && isOpen) {
      setLoading(true);

      if (isEmployeeDocument) {
        // ✅ Employee-specific docs: single acknowledgement check
        fetch(`/api/documents/acknowledge/${documentId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.acknowledged) {
              setAcknowledged([
                { name: data.employee.name, email: data.employee.email, acknowledgedAt: data.acknowledgedAt },
              ]);
              setPending([]);
            } else {
              setAcknowledged([]);
              setPending([{ name: data.employee.name, email: data.employee.email }]);
            }
          })
          .finally(() => setLoading(false));
      } else {
        // ✅ Company-wide docs: fetch full lists
        fetch(`/api/documents/acknowledge/${documentId}`)
          .then((res) => res.json())
          .then((data) => {
            setAcknowledged(
              (data.acknowledged || []).map((ack: any) => ({
                name: ack.name,
                email: ack.email,
                acknowledgedAt: ack.acknowledgedAt,
                department: ack.department || null,
                jobRole: ack.jobRole || null,
              }))
            );
            setPending(data.pending || []);
          })
          .finally(() => setLoading(false));
      }
    }
  }, [documentId, isOpen, isEmployeeDocument]); // ✅ Depend on all relevant triggers

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Department", "Job Role", "Status", "Acknowledged At"],
      ...acknowledged.map((a) => [
        a.name,
        a.email,
        a.department || "",
        a.jobRole || "",
        "Acknowledged",
        a.acknowledgedAt || "",
      ]),
      ...pending.map((p) => [p.name, p.email, "", "", "Pending", ""]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName || "document"}_acknowledgements.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEmployeeDocument ? "View Acknowledgement" : "View Acknowledgements"}: {documentName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading acknowledgements...</p>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold">✅ Acknowledged ({acknowledged.length})</h3>
            {acknowledged.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {!isEmployeeDocument && <TableHead>Department</TableHead>}
                    {!isEmployeeDocument && <TableHead>Job Role</TableHead>}
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acknowledged.map((a) => (
                    <TableRow key={a.email}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      {!isEmployeeDocument && <TableCell>{a.department || "-"}</TableCell>}
                      {!isEmployeeDocument && <TableCell>{a.jobRole || "-"}</TableCell>}
                      <TableCell>{a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500">
                {isEmployeeDocument ? "No acknowledgement yet from this employee." : "No acknowledgements yet."}
              </p>
            )}

            {/* ✅ Only show pending for company docs */}
            {!isEmployeeDocument && (
              <>
                <h3 className="font-semibold mt-4">❌ Pending ({pending.length})</h3>
                {pending.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pending.map((p) => (
                        <TableRow key={p.email}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500">No pending acknowledgements.</p>
                )}
              </>
            )}

            <Button onClick={exportCSV} className="mt-4 w-full">
              Export to CSV
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}