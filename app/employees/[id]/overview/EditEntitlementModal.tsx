"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export default function EditEntitlementModal({
    open,
    setOpen,
    employeeId,
    currentEntitlement,
    refresh
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    employeeId: string;
    currentEntitlement: any;
    refresh: () => void;
}) {
    const [annualLeave, setAnnualLeave] = useState(currentEntitlement?.annualLeave ?? 20);
    const [sickLeave, setSickLeave] = useState(currentEntitlement?.sickLeave ?? 10);
    const [bereavement, setBereavement] = useState(currentEntitlement?.bereavement ?? 3);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (annualLeave < 20 || sickLeave < 10 || bereavement < 3) {
            alert("Cannot set entitlements below NZ legal minimums.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}/entitlement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ annualLeave, sickLeave, bereavement }),
            });
            if (!res.ok) throw new Error("Failed to update entitlement.");
            setOpen(false);
            refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to update entitlement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Leave Entitlement</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <label className="block">
                        Annual Leave (min 20):
                        <Input
                            type="number"
                            min={20}
                            value={annualLeave}
                            onChange={(e) => setAnnualLeave(parseInt(e.target.value))}
                        />
                    </label>
                    <label className="block">
                        Sick Leave (min 10):
                        <Input
                            type="number"
                            min={10}
                            value={sickLeave}
                            onChange={(e) => setSickLeave(parseInt(e.target.value))}
                        />
                    </label>
                    <label className="block">
                        Bereavement Leave (min 3):
                        <Input
                            type="number"
                            min={3}
                            value={bereavement}
                            onChange={(e) => setBereavement(parseInt(e.target.value))}
                        />
                    </label>
                    <Button disabled={loading} onClick={handleSubmit}>
                        {loading ? "Saving..." : "Save Entitlement"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
