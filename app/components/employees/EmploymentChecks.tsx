"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { toast } from "sonner";
import { format } from "date-fns";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";

export default function EmploymentChecks({
  employeeId,
}: {
  employeeId: string;
}) {
  const [checks, setChecks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<any>(null);

  const [typeOfCheck, setTypeOfCheck] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [dateOfIssue, setDateOfIssue] = useState("");
  const [dateOfExpiry, setDateOfExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const fetchChecks = async () => {
      try {
        const res = await fetch(
          `/api/employment-checks/list?employeeId=${employeeId}`,
        );
        const data = await res.json();
        setChecks(data);
      } catch (error) {
        console.error("Failed to fetch checks:", error);
      }
    };

    if (employeeId) {
      fetchChecks();
    }
  }, [employeeId]);

  const openEditModal = (check: any) => {
    setSelectedCheck(check);
    setTypeOfCheck(check.typeOfCheck || "");
    setDocumentNumber(check.documentNumber || "");
    setDateOfIssue(check.dateOfIssue ? check.dateOfIssue.slice(0, 10) : "");
    setDateOfExpiry(check.expiryDate ? check.expiryDate.slice(0, 10) : "");
    setEditMode(true);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry) {
      toast.error("Please complete all fields.");
      return;
    }

    // Prepare FormData and open reasons modal
    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("typeOfCheck", typeOfCheck);
    formData.append("documentNumber", documentNumber);
    formData.append("dateOfIssue", dateOfIssue);
    formData.append("expiryDate", dateOfExpiry);
    formData.append("employeeId", employeeId);

    // Build change summary for audit reasons
    const changes: ChangeInfo[] = [
      {
        field: "typeOfCheck",
        oldValue: editMode ? String(selectedCheck?.typeOfCheck || "") : "",
        newValue: String(typeOfCheck || ""),
      },
      {
        field: "documentNumber",
        oldValue: editMode ? String(selectedCheck?.documentNumber || "") : "",
        newValue: String(documentNumber || ""),
      },
      {
        field: "dateOfIssue",
        oldValue: editMode
          ? String(selectedCheck?.dateOfIssue ? selectedCheck.dateOfIssue.slice(0, 10) : "")
          : "",
        newValue: String(dateOfIssue || ""),
      },
      {
        field: "expiryDate",
        oldValue: editMode
          ? String(selectedCheck?.expiryDate ? selectedCheck.expiryDate.slice(0, 10) : "")
          : "",
        newValue: String(dateOfExpiry || ""),
      },
    ];

    setPendingFormData(formData);
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Employment Checks</h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditMode(false);
              setSelectedCheck(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditMode(false);
                setSelectedCheck(null);
              }}
            >
              Add Employment Check
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editMode ? "Edit" : "Add"} Employment Check
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type of Check</Label>
                <Select value={typeOfCheck} onValueChange={setTypeOfCheck}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select check type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passport">Passport</SelectItem>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Right to Work">Right to Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Number</Label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="E.g., ABC123456"
                />
              </div>
              <div>
                <Label>Date of Issue</Label>
                <Input
                  type="date"
                  value={dateOfIssue}
                  onChange={(e) => setDateOfIssue(e.target.value)}
                />
              </div>
              <div>
                <Label>Date of Expiry</Label>
                <Input
                  type="date"
                  value={dateOfExpiry}
                  onChange={(e) => setDateOfExpiry(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  {editMode
                    ? "Replace Document (optional)"
                    : "Upload Document (optional)"}
                </Label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading
                  ? editMode
                    ? "Updating..."
                    : "Uploading..."
                  : editMode
                    ? "Update Employment Check"
                    : "Upload Employment Check"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type of Check</TableHead>
            <TableHead>Document Number</TableHead>
            <TableHead>Date of Issue</TableHead>
            <TableHead>Date of Expiry</TableHead>
            <TableHead>Download</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checks.map((check) => (
            <TableRow
              key={check.id}
              onClick={() => openEditModal(check)}
              className="cursor-pointer hover:bg-muted"
            >
              <TableCell>{check.typeOfCheck}</TableCell>
              <TableCell>{check.documentNumber}</TableCell>
              <TableCell>
                {check.dateOfIssue
                  ? format(new Date(check.dateOfIssue), "dd/MM/yyyy")
                  : "N/A"}
              </TableCell>
              <TableCell>
                {check.expiryDate
                  ? format(new Date(check.expiryDate), "dd/MM/yyyy")
                  : "N/A"}
              </TableCell>
              <TableCell>
                {check.documentUrl ? (
                  <a
                    href={check.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  "N/A"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ChangeReasonModal
        isOpen={isReasonOpen}
        onClose={() => {
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingFormData(null);
          setLoading(false);
        }}
        changes={pendingChanges}
        onSubmit={async (reasons) => {
          if (!pendingFormData) return;
          try {
            setLoading(true);
            pendingFormData.append("reasons", JSON.stringify(reasons));
            const url = editMode
              ? `/api/employment-checks/${selectedCheck.id}`
              : "/api/employment-checks/create";
            const method = editMode ? "PATCH" : "POST";

            const res = await fetch(url, {
              method,
              body: pendingFormData,
            });

            if (res.ok) {
              const updatedCheck = await res.json();
              toast.success(
                editMode ? "Employment Check updated" : "Employment Check created",
              );

              if (editMode) {
                setChecks((prev) =>
                  prev.map((c) => (c.id === updatedCheck.id ? updatedCheck : c)),
                );
              } else {
                setChecks((prev) => [updatedCheck, ...prev]);
              }

              // reset form
              setTypeOfCheck("");
              setDocumentNumber("");
              setDateOfIssue("");
              setDateOfExpiry("");
              setFile(null);
              setOpen(false);
              setEditMode(false);
              setSelectedCheck(null);
            } else {
              const msg = await res.json().catch(() => ({} as any));
              toast.error(msg?.error || "Failed to save Employment Check");
            }
          } catch (error) {
            console.error(error);
            toast.error("An error occurred");
          } finally {
            setLoading(false);
            setIsReasonOpen(false);
            setPendingChanges([]);
            setPendingFormData(null);
          }
        }}
      />
    </div>
  );
}
