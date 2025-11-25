"use client";

import { useEffect, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { mutate } from "swr";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Briefcase, Sparkles, Trash2, AlertCircle } from "lucide-react";

export default function NewJobRoleModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: (created?: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/job-roles");
      if (!res.ok) return setRoles([]);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.jobRoles || [];
      setRoles(arr);
    } catch {
      setRoles([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/job-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create job role.");
        return;
      }
      const payload = await res.json();
      const created = payload?.jobRole || payload; // handle both shapes
      mutate("/api/audience");
      onAdded?.(created);
      setName("");
      setError("");
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/job-roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete job role.");
      } else {
        onAdded?.();
        await load();
        setError("");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-lg rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Manage Job Roles
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add or remove job roles across your company
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-8 pb-8 max-h-[65vh] overflow-y-auto space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Existing Job Roles */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Existing Job Roles</span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-auto">
                <AnimatePresence>
                  {roles.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium">{r.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(r.id)}
                        disabled={loading}
                        className="h-8 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {roles.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">No job roles yet.</p>
                )}
              </div>
            </div>

            {/* Add New Job Role */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Job Role Name <span className="text-primary">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter job role name"
                  required
                  className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="h-11 rounded-xl"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white font-semibold shadow-lg shadow-primary/25"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Add Job Role
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
      </DialogContent>
    </Dialog>
  );
}
