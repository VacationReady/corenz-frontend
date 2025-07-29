import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";

interface Acknowledgement {
  name: string;
  email: string;
  acknowledgedAt?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentName: string | null;
}

export default function ViewAcknowledgementsModal({ isOpen, onClose, documentId, documentName }: Props) {
  const [acknowledged, setAcknowledged] = useState<Acknowledgement[]>([]);
  const [pending, setPending] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (documentId && isOpen) {
      setLoading(true);
      fetch(`/api/documents/acknowledge/${documentId}`)
        .then((res) => res.json())
        .then((data) => {
          // ✅ For employee-level docs, convert API response to single-item acknowledged or pending
          if (data.acknowledged) {
            setAcknowledged([
              { name: data.employee.name, email: data.employee.email, acknowledgedAt: data.acknowledgedAt },
            ]);
            setPending([]); // no pending for individual employee docs
          } else {
            setAcknowledged([]);
            setPending([{ name: data.employee.name, email: data.employee.email }]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [documentId, isOpen]);

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Status", "Acknowledged At"],
      ...acknowledged.map((a) => [a.name, a.email, "Acknowledged", a.acknowledgedAt || ""]),
      ...pending.map((p) => [p.name, p.email, "Pending", ""]),
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
          <DialogTitle>View Acknowledgement: {documentName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading acknowledgement...</p>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold">✅ Acknowledged ({acknowledged.length})</h3>
            {acknowledged.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acknowledged.map((a) => (
                    <TableRow key={a.email}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>{a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500">No acknowledgements yet.</p>
            )}

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

            <Button onClick={exportCSV} className="mt-4 w-full">
              Export to CSV
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
