"use client";

import React, { useEffect, useRef, useState, useMemo, ChangeEvent, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Briefcase, PenLine, UserRound, X, AlertTriangle } from "lucide-react";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

interface Field {
  pageNumber: number;
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
  label?: string;
  assignedEmployeeId?: string;
}

const fieldThemes = {
  signature: {
    icon: PenLine,
    border: "border-sky-200",
    iconBg: "bg-sky-100 text-sky-700",
    accent: "text-sky-700",
  },
  name: {
    icon: UserRound,
    border: "border-purple-200",
    iconBg: "bg-purple-100 text-purple-700",
    accent: "text-purple-700",
  },
  job: {
    icon: Briefcase,
    border: "border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-700",
  },
};

const paletteOptions = [
  {
    type: "SIGNATURE" as const,
    label: "Signature",
    description: "Capture a legally binding e-signature.",
    icon: PenLine,
    accent: "text-sky-600",
    iconBg: "bg-sky-100 text-sky-700",
  },
  {
    type: "NAME" as const,
    label: "Name",
    description: "Collect the printed/full name.",
    icon: UserRound,
    accent: "text-purple-600",
    iconBg: "bg-purple-100 text-purple-700",
  },
  {
    type: "JOB_ROLE" as const,
    label: "Job Role",
    description: "Confirm the signer's title/role.",
    icon: Briefcase,
    accent: "text-emerald-600",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
];

const getFieldTheme = (label?: string) => {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("job")) return fieldThemes.job;
  if (normalized.includes("name")) return fieldThemes.name;
  return fieldThemes.signature;
};

// Searchable Select Helper
const SelectSearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div className="sticky top-0 z-10 bg-popover p-2 border-b border-muted/40">
    <Input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search..."}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.stopPropagation()}
      autoFocus
      className="h-9"
    />
  </div>
);

const filterBySearch = <T,>(
  items: T[],
  accessor: (item: T) => string | undefined,
  query: string,
) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const value = accessor(item);
    if (!value) {
      return false;
    }
    return value.toLowerCase().includes(normalized);
  });
};

export default function FieldPlacementModal({
  isOpen,
  onClose,
  documentId,
  url,
  saveMode = "server",
  onSaveFields,
  onSaveComplete,
  sendingNotifications = false,
  defaultAssigneeId,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  url: string;
  saveMode?: "server" | "local";
  onSaveFields?: (fields: Field[]) => void;
  onSaveComplete?: () => Promise<void>;
  sendingNotifications?: boolean;
  defaultAssigneeId?: string;
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
  
  // Searchable select state
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [isAssigneeSelectOpen, setIsAssigneeSelectOpen] = useState(false);

  // Dirty state tracking
  const [initialFields, setInitialFields] = useState<Field[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  
  const tenantFetch = useTenantFetch();

  // Filtered assignees for search
  const filteredAssignees = useMemo(() => {
    return filterBySearch(assignees, (a) => a.name, assigneeSearch);
  }, [assignees, assigneeSearch]);

  useEffect(() => {
    if (!isOpen) {
      // Reset dirty state when modal closes
      setIsDirty(false);
      setShowConfirmClose(false);
      return;
    }
    if (saveMode === "local") {
      setDocUrl(url);
      setFields((prev) => prev); // keep local edits
    } else {
      tenantFetch(`/api/documents/signature-fields/${documentId}`)
        .then((r: Response) => r.json())
        .then((data: any) => {
          const loadedFields = data || [];
          setFields(loadedFields);
          setInitialFields(JSON.parse(JSON.stringify(loadedFields))); // Deep copy for comparison
        })
        .catch(() => {
          setFields([]);
          setInitialFields([]);
        });
      // Always fetch a fresh signed URL to guarantee preview
      tenantFetch(`/api/documents/signed-url/${documentId}`)
        .then((r: Response) => r.json())
        .then((d: any) => setDocUrl(d?.url || url))
        .catch(() => setDocUrl(url));
    }
    // Load employee list for assignees (supports server route: /api/employees?status=active)
    tenantFetch(`/api/employees?status=active`)
      .then((r: Response) => r.ok ? r.json() : [])
      .then((arr: any[]) => {
        const sorted = (arr || [])
          .map((e: any) => ({ id: e.id, name: `${e.firstName || e.user?.firstName || ""} ${e.lastName || e.user?.lastName || ""}`.trim() }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setAssignees(sorted);
      })
      .catch(() => setAssignees([]));
  }, [documentId, isOpen, url, saveMode, tenantFetch]);

  // Set default assignee when assignees load
  useEffect(() => {
    if (defaultAssigneeId && assignees.length > 0 && !selectedAssignee) {
      const exists = assignees.find(a => a.id === defaultAssigneeId);
      if (exists) {
        setSelectedAssignee(defaultAssigneeId);
      }
    }
  }, [defaultAssigneeId, assignees, selectedAssignee]);

  // Check if fields have changed
  useEffect(() => {
    const hasChanged = JSON.stringify(fields) !== JSON.stringify(initialFields);
    setIsDirty(hasChanged);
  }, [fields, initialFields]);

  const addField = (type: "SIGNATURE" | "NAME" | "JOB_ROLE") => {
    // Increased default height slightly to prevent icon cutoff
    const base = { pageNumber: 1, x: 0.1, y: 0.1, width: 0.25, height: 0.1 } as Field;
    const label = type === "SIGNATURE" ? "Signature" : type === "NAME" ? "Name" : "Job Role";
    setFields((prev) => [
      ...prev,
      { ...base, label, assignedEmployeeId: selectedAssignee || undefined },
    ]);
  };

  const handleClose = () => {
    if (isDirty && !sendingNotifications) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    setIsDirty(false);
    onClose();
  };

  const cancelClose = () => {
    setShowConfirmClose(false);
  };

  const save = async () => {
    if (saveMode === "local" && onSaveFields) {
      onSaveFields(fields);
      setIsDirty(false);
      onClose();
      return;
    }
    
    try {
      const res: Response = await tenantFetch(`/api/documents/signature-fields/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save signature fields");
      }
      
      // Mark as saved
      setIsDirty(false);
      setInitialFields(JSON.parse(JSON.stringify(fields)));
      
      // If there's a completion callback (e.g., to send notifications), call it
      if (onSaveComplete) {
        await onSaveComplete();
      } else {
        // Normal flow - just close the modal
        onClose();
      }
    } catch (error) {
      console.error("Error saving signature fields:", error);
      // Even if there's an error, we might want to let the parent handle it
      // For now, we'll still close to avoid blocking the user
      onClose();
    }
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

  const getAssigneeName = (id?: string) => {
    if (!id) return "";
    return assignees.find(a => a.id === id)?.name || "";
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Place Signature Fields</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-9">
            <div
              ref={containerRef}
              className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50"
              style={{ height: 600 }}
              onPointerMove={onPointerMoveContainer}
              onPointerUp={onPointerUpContainer}
            >
              {/* Use embed to render files cross-origin where possible */}
              {docUrl ? (
                <embed src={docUrl + "#toolbar=0&navpanes=0&scrollbar=1"} type="application/pdf" className="w-full h-full" />
              ) : null}
              {fields.map((f, idx) => {
                const theme = getFieldTheme(f.label);
                const Icon = theme.icon;
                const assigneeName = getAssigneeName(f.assignedEmployeeId);
                
                return (
                  <div
                    key={idx}
                    className={`absolute border ${theme.border} bg-white/95 rounded-xl shadow-xl shadow-slate-900/10 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none transition flex items-center`}
                    style={{
                      left: `${f.x * 100}%`,
                      top: `${f.y * 100}%`,
                      width: `${f.width * 100}%`,
                      height: `${f.height * 100}%`,
                      transform: "translate(-50%, -50%)",
                      willChange: "left, top, transform",
                      padding: "8px 12px", // Reduced vertical padding for better fit
                    }}
                    onPointerDown={(e) => onPointerDownField(idx, e)}
                  >
                    <div className="flex items-center gap-3 pointer-events-none w-full overflow-hidden">
                      <span className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${theme.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {assigneeName || f.label || "Signature"}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {assigneeName ? f.label || "Signature" : "Drag to reposition"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full border border-white/80 bg-white/90 text-slate-500 shadow-sm flex items-center justify-center hover:text-slate-900 z-10"
                      aria-label="Remove field"
                      onPointerDown={(e) => e.stopPropagation()} 
                      onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        setFields((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="col-span-3 space-y-3">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
              <div className="font-semibold text-sm text-slate-900 mb-3">Palette</div>
              <div className="space-y-2">
                {paletteOptions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.type}
                      type="button"
                      variant="ghost"
                      className="w-full justify-between border border-slate-200 hover:border-slate-300 bg-white text-left h-auto py-3 px-3 rounded-xl"
                      onClick={() => addField(item.type)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-9 h-9 rounded-full ${item.iconBg}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 leading-tight">{item.label}</div>
                          <p className="text-xs text-muted-foreground leading-tight">{item.description}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${item.accent}`}>Add</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
              <div className="font-medium mb-2">Assign signer</div>
              <Select
                value={selectedAssignee}
                onValueChange={setSelectedAssignee}
                open={isAssigneeSelectOpen}
                onOpenChange={(open) => {
                  setIsAssigneeSelectOpen(open);
                  if (!open) setAssigneeSearch("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectSearchInput
                    value={assigneeSearch}
                    onChange={setAssigneeSearch}
                    placeholder="Search employees..."
                  />
                  <SelectItem value="unassigned_item_null">Unassigned</SelectItem>
                  {filteredAssignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Select
                    value={f.assignedEmployeeId || "unassigned_item_null"}
                    onValueChange={(v) => {
                      const newVal = v === "unassigned_item_null" ? undefined : v;
                      setFields((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], assignedEmployeeId: newVal };
                        return copy;
                      });
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectSearchInput
                        value={assigneeSearch}
                        onChange={setAssigneeSearch}
                        placeholder="Search employees..."
                      />
                      <SelectItem value="unassigned_item_null">Unassigned</SelectItem>
                      {filteredAssignees.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="text-xs text-muted-foreground">
                    x: {f.x.toFixed(2)} y: {f.y.toFixed(2)} w: {f.width.toFixed(2)} h: {f.height.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={sendingNotifications}
          >
            Cancel
          </Button>
          <Button 
            onClick={save}
            loading={sendingNotifications}
            loadingText="Sending notifications..."
          >
            {onSaveComplete ? "Save & Send Notifications" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmClose} onOpenChange={cancelClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle>Discard Unsaved Changes?</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            You have unsaved signature field changes. If you close now, these fields will be lost and notifications will not be sent.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={cancelClose}
          >
            Keep Editing
          </Button>
          <Button 
            variant="danger"
            onClick={confirmClose}
          >
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
