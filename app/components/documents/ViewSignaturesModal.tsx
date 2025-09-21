"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";

export default function ViewSignaturesModal({
  isOpen,
  onClose,
  documentId,
  documentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentName: string | null;
}) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!isOpen || !documentId) return;
    fetch(`/api/documents/signatures/${documentId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [isOpen, documentId]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Employee", "Method", "Signed At", "IP", "User Agent", "Artifact"],
      ...data.artifacts.map((a: any) => [
        a.employeeName || a.employeeId,
        a.method,
        new Date(a.signedAt).toISOString(),
        a.ipAddress || "",
        a.userAgent || "",
        a.artifactUrl || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || "").toString().replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName || "document"}-signatures.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Signatures — {documentName}</DialogTitle>
        </DialogHeader>
        {!data ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Required: {data.document.requiresSignature ? "Yes" : "No"} {data.document.signatureDueAt ? `(Due ${new Date(data.document.signatureDueAt).toLocaleString()})` : ""}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {data.artifacts.map((a: any) => (
                <div key={a.id} className="border rounded p-3">
                  <div className="text-sm font-medium">{a.employeeName || a.employeeId}</div>
                  <div className="text-xs text-muted-foreground">{a.method} — {new Date(a.signedAt).toLocaleString()}</div>
                  {a.artifactUrl ? (
                    <img src={a.artifactUrl} className="mt-2 border rounded" alt="Signature" />
                  ) : a.typedText ? (
                    <div className="mt-2 text-2xl">{a.typedText}</div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="text-sm">
              Outstanding: {data.outstanding.count}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


