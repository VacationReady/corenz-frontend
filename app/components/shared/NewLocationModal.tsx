"use client";

import { useEffect, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { mutate } from "swr";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { MapPin, Sparkles, Trash2, AlertCircle } from "lucide-react";

export default function NewLocationModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: (created: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) return setLocations([]);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLocations(arr);
    } catch {
      setLocations([]);
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
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create location.");
        return;
      }
      const created = await res.json();
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
      await fetch("/api/locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch {
      // no-op
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-lg rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Manage Locations
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add or remove locations across your company
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

            {/* Existing Locations */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Existing Locations</span>
              </div>
              
              <div className="space-y-2 max-h-56 overflow-auto">
                <AnimatePresence>
                  {locations.map((l) => (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium">{l.name}</span>
                      <Button
                        variant="ghost"
                        onClick={() => remove(l.id)}
                        className="h-8 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {locations.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">No locations yet.</p>
                )}
              </div>
            </div>

            {/* Add New Location */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Location Name <span className="text-primary">*</span>
                </Label>
                <Input
                  placeholder="Enter location name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/25"
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
                      Add Location
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


