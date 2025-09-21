"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";

interface Field {
  pageNumber: number;
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
  label?: string;
  assignedEmployeeId?: string;
}

export default function FieldPlacementModal({
  isOpen,
  onClose,
  documentId,
  url,
  saveMode = "server",
  onSaveFields,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  url: string;
  saveMode?: "server" | "local";
  onSaveFields?: (fields: Field[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastPointerEventRef = useRef<React.PointerEvent<HTMLDivElement> | null>(null);

  const [docUrl, setDocUrl] = useState<string>("");
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    if (saveMode === "local") {
      setDocUrl(url);
      setFields((prev) => prev); // keep local edits
    } else {
      fetch(`/api/documents/signature-fields/${documentId}`)
        .then((r) => r.json())
        .then((data) => setFields(data || []))
        .catch(() => setFields([]));
      // Always fetch a fresh signed URL to guarantee preview
      fetch(`/api/documents/signed-url/${documentId}`)
        .then((r) => r.json())
        .then((d) => setDocUrl(d?.url || url))
        .catch(() => setDocUrl(url));
    }
    // Load employee list for assignees (supports server route: /api/employees?status=active)
    fetch(`/api/employees?status=active`)
      .then((r) => r.ok ? r.json() : [])
      .then((arr) =>
        setAssignees(
          (arr || []).map((e: any) => ({ id: e.id, name: `${e.firstName || e.user?.firstName || ""} ${e.lastName || e.user?.lastName || ""}`.trim() })),
        ),
      )
      .catch(() => setAssignees([]));
  }, [documentId, isOpen, url, saveMode]);

  const addField = (type: "SIGNATURE" | "NAME" | "JOB_ROLE") => {
    const base = { pageNumber: 1, x: 0.1, y: 0.1, width: 0.25, height: 0.08 } as Field;
    const label = type === "SIGNATURE" ? "Signature" : type === "NAME" ? "Name" : "Job Role";
    setFields((prev) => [
      ...prev,
      { ...base, label, assignedEmployeeId: selectedAssignee || undefined },
    ]);
  };

  const save = async () => {
    if (saveMode === "local" && onSaveFields) {
      onSaveFields(fields);
      onClose();
      return;
    }
    await fetch(`/api/documents/signature-fields/${documentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    onClose();
  };

  const onPointerDownField = (idx: number, e: React.PointerEvent<HTMLDivElement>) => {
    setDraggingIdx(idx);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const f = fields[idx];
    const centerX = rect.left + f.x * rect.width;
    const centerY = rect.top + f.y * rect.height;
    dragOffsetRef.current = { dx: e.clientX - centerX, dy: e.clientY - centerY };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerUpContainer = () => {
    setDraggingIdx(null);
    dragOffsetRef.current = null;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    lastPointerEventRef.current = null;
  };

  const onPointerMoveContainer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingIdx === null || !containerRef.current) return;
    lastPointerEventRef.current = e;
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const ev = lastPointerEventRef.current;
      if (!ev) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const offset = dragOffsetRef.current || { dx: 0, dy: 0 };
      const centerClientX = ev.clientX - offset.dx;
      const centerClientY = ev.clientY - offset.dy;
      let x = (centerClientX - rect.left) / rect.width;
      let y = (centerClientY - rect.top) / rect.height;
      x = Math.min(Math.max(0, x), 1);
      y = Math.min(Math.max(0, y), 1);
      setFields((prev) => {
        const copy = [...prev];
        copy[draggingIdx] = { ...copy[draggingIdx], x, y };
        return copy;
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Place Signature Fields</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-9">
            <div
              ref={containerRef}
              className="relative border rounded overflow-hidden"
              style={{ height: 600 }}
              onPointerMove={onPointerMoveContainer}
              onPointerUp={onPointerUpContainer}
            >
              {/* Use embed to render files cross-origin where possible */}
              {docUrl ? (
                <embed src={docUrl} type="application/pdf" className="w-full h-full" />
              ) : null}
              {fields.map((f, idx) => (
                <div
                  key={idx}
                  className="absolute bg-amber-200 border border-amber-500 text-amber-900 text-xs flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                  style={{
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    width: `${f.width * 100}%`,
                    height: `${f.height * 100}%`,
                    transform: "translate(-50%, -50%)",
                    willChange: "left, top, transform",
                  }}
                  onPointerDown={(e) => onPointerDownField(idx, e)}
                >
                  <span className="pointer-events-none px-2 text-center truncate">
                    {f.label || "Signature"}
                  </span>
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white leading-none flex items-center justify-center"
                    aria-label="Remove field"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setFields((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-3 space-y-3">
            <div className="border rounded p-2">
              <div className="font-medium mb-2">Palette</div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => addField("SIGNATURE")} variant="secondary">Signature</Button>
                <Button onClick={() => addField("NAME")} variant="outline">Name</Button>
                <Button onClick={() => addField("JOB_ROLE")} variant="outline">Job Role</Button>
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="font-medium mb-2">Assign signer</div>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="text-xs text-muted-foreground mt-1">New fields will be assigned to the selected signer.</div>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-auto">
              {fields.map((f, idx) => (
                <div key={idx} className="border rounded p-2 space-y-1">
                  <Label className="text-xs">Label</Label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={f.label || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFields((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], label: v };
                        return copy;
                      });
                    }}
                  />
                  <div className="text-xs">Assigned to</div>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={f.assignedEmployeeId || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFields((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], assignedEmployeeId: v || undefined };
                        return copy;
                      });
                    }}
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground">
                    x: {f.x.toFixed(2)} y: {f.y.toFixed(2)} w: {f.width.toFixed(2)} h: {f.height.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


