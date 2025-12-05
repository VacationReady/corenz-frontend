"use client";

import { useState, ChangeEvent } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { PlusCircle, Sparkles, Tag } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { toast } from "react-hot-toast";

interface AddSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentCategoryId: string;
  parentCategoryName: string;
}

export default function AddSubcategoryModal({
  isOpen,
  onClose,
  onSuccess,
  parentCategoryId,
  parentCategoryName,
}: AddSubcategoryModalProps) {
  const [name, setName] = useState("");
  const [defaultPaidStatus, setDefaultPaidStatus] = useState<"PAID" | "UNPAID">(
    "PAID",
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/event-subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          eventCategoryId: parentCategoryId,
          defaultPaidStatus,
          isActive: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Subcategory added under ${parentCategoryName}`);
        setName("");
        setDefaultPaidStatus("PAID");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to add subcategory.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-lg rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Add Subcategory
                </h2>
                <p className="text-sm text-muted-foreground">
                  Under {parentCategoryName}
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-8 pb-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="subcategoryName" className="text-sm font-medium text-foreground/80">
                Subcategory Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="subcategoryName"
                placeholder="e.g., Doctor's Appointment"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Default Paid Status</Label>
              <Select
                value={defaultPaidStatus}
                onValueChange={(v: string) => setDefaultPaidStatus(v as "PAID" | "UNPAID")}
              >
                <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={loading}
                className="h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
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
                    Adding...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Add Subcategory
                  </>
                )}
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
