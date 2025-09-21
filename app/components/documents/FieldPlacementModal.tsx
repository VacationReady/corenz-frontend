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
}

export default function FieldPlacementModal({
  isOpen,
  onClose,
  documentId,
  url,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  url: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/documents/signature-fields/${documentId}`)
      .then((r) => r.json())
      .then((data) => setFields(data || []))
      .catch(() => setFields([]));
  }, [documentId, isOpen]);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { pageNumber: 1, x: 0.1, y: 0.1, width: 0.25, height: 0.08, label: "Signature" },
    ]);
  };

  const save = async () => {
    await fetch(`/api/documents/signature-fields/${documentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    onClose();
  };

  const onMouseDown = (idx: number) => setDraggingIdx(idx);
  const onMouseUp = () => setDraggingIdx(null);
  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingIdx === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFields((prev) => {
      const copy = [...prev];
      copy[draggingIdx] = { ...copy[draggingIdx], x: Math.min(Math.max(0, x), 1), y: Math.min(Math.max(0, y), 1) };
      return copy;
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
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            >
              <iframe src={url} className="w-full h-full" />
              {fields.map((f, idx) => (
                <div
                  key={idx}
                  className="absolute bg-amber-200 border border-amber-500 text-amber-900 text-xs flex items-center justify-center cursor-move"
                  style={{
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    width: `${f.width * 100}%`,
                    height: `${f.height * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseDown={() => onMouseDown(idx)}
                >
                  {f.label || "Signature"}
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-3 space-y-3">
            <Button onClick={addField} variant="secondary" className="w-full">
              Add Field
            </Button>
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


