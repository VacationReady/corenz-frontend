'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Gift,
  Tag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { useTenantFetch } from '@/hooks/useTenantFetch';

interface OtherEntitlement {
  id?: string;
  name: string;
  balance: number;
  unit: string;
  notes?: string;
  // Category-based entitlements (from EventCategory with balanceRequired=true)
  isEventCategory?: boolean;
  eventCategoryId?: string | null;
  totalDays?: number | null;
  usedDays?: number | null;
}

interface EditOtherEntitlementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess?: () => void;
  /** If true, hides the "Add Entitlement" button (used when accessed via choice dialog) */
  hideAddButton?: boolean;
}

export default function EditOtherEntitlementsModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
  hideAddButton = false,
}: EditOtherEntitlementsModalProps) {
  const [entitlements, setEntitlements] = useState<OtherEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const tenantFetch = useTenantFetch();

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEntitlements();
    }
  }, [isOpen, employeeId]);

  const fetchEntitlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tenantFetch(`/api/employees/${employeeId}/other-entitlements`);
      if (res.ok) {
        const data = await res.json();
        setEntitlements(data.entitlements || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load entitlements');
      }
    } catch (err) {
      setError('Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntitlement = () => {
    setEntitlements([
      ...entitlements,
      { name: '', balance: 0, unit: 'days', isEventCategory: false },
    ]);
  };

  const handleRemoveEntitlement = (index: number) => {
    // Don't allow removing category-based entitlements
    if (entitlements[index]?.isEventCategory) return;
    setEntitlements(entitlements.filter((_, i) => i !== index));
  };

  const handleUpdateEntitlement = (
    index: number,
    field: keyof OtherEntitlement,
    value: string | number
  ) => {
    const updated = [...entitlements];
    updated[index] = { ...updated[index], [field]: value };
    setEntitlements(updated);
  };

  const handleSave = async () => {
    setError(null);

    // Validate
    const validEntitlements = entitlements.filter((e) => e.name.trim());
    const names = validEntitlements.map((e) => e.name.trim().toLowerCase());
    const hasDuplicates = names.length !== new Set(names).size;

    if (hasDuplicates) {
      setError('Each entitlement must have a unique name');
      return;
    }

    setSaving(true);
    try {
      const res = await tenantFetch(`/api/employees/${employeeId}/other-entitlements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entitlements: validEntitlements }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save entitlements');
      }

      const data = await res.json();
      setEntitlements(data.entitlements || []);

      toast({
        title: 'Entitlements Updated',
        description: 'Other entitlements have been saved successfully',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entitlements');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <DialogTitle className="text-xl font-bold">Other Entitlements</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage leave balances for event categories and custom entitlements
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {entitlements.map((entitlement, index) => (
                  <motion.div
                    key={entitlement.id || `new-${index}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-muted/30 border border-border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Name
                          </Label>
                          {entitlement.isEventCategory ? (
                            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/50 border border-border">
                              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{entitlement.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">Event Category</span>
                            </div>
                          ) : (
                            <Input
                              value={entitlement.name}
                              onChange={(e) =>
                                handleUpdateEntitlement(index, 'name', e.target.value)
                              }
                              placeholder="e.g., Time in Lieu"
                              className="h-9 rounded-lg"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                              {entitlement.isEventCategory ? 'Remaining Balance' : 'Balance'}
                            </Label>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={entitlement.balance}
                              onChange={(e) =>
                                handleUpdateEntitlement(
                                  index,
                                  'balance',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-9 rounded-lg"
                            />
                            {entitlement.isEventCategory && entitlement.usedDays != null && (
                              <p className="text-xs text-muted-foreground">
                                {entitlement.usedDays} days used
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Unit
                            </Label>
                            {entitlement.isEventCategory ? (
                              <div className="flex items-center h-9 px-3 rounded-lg bg-muted/50 border border-border">
                                <span className="text-sm">Days</span>
                              </div>
                            ) : (
                              <Select
                                value={entitlement.unit}
                                onValueChange={(value) =>
                                  handleUpdateEntitlement(index, 'unit', value)
                                }
                              >
                                <SelectTrigger className="h-9 rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="days">Days</SelectItem>
                                  <SelectItem value="hours">Hours</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </div>

                      {!entitlement.isEventCategory && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEntitlement(index)}
                          className="p-2 h-auto text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {entitlements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No other entitlements</p>
                  {!hideAddButton && (
                    <p className="text-xs mt-1">Click "Add Entitlement" to create one</p>
                  )}
                </div>
              )}

              {!hideAddButton && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddEntitlement}
                  className="w-full rounded-xl border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entitlement
                </Button>
              )}

              {/* Warning for custom entitlements */}
              {entitlements.some((e) => !e.isEventCategory) && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Custom entitlements (not linked to an event category) cannot be booked via self-service. 
                    Consider creating a company-wide event type in Event Manager for full functionality.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
