"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

interface DeleteBlackoutModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    eventRuleId: string;
    blackoutDates: string[]; // ISO date strings
    refreshEvents: () => void;
}

export default function DeleteBlackoutModal({
    open,
    setOpen,
    eventRuleId,
    blackoutDates,
    refreshEvents
}: DeleteBlackoutModalProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async (dateToRemove: string) => {
        try {
            setLoading(true);
            const res = await fetch("/api/event-rules/blackout/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventRuleId, dateToRemove }),
            });
            if (!res.ok) throw new Error("Failed to delete blackout date.");
            toast.success("Blackout date removed successfully");
            refreshEvents();
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove blackout date");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Remove Blackout Date</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    {blackoutDates.length === 0 ? (
                        <p>No blackout dates to remove.</p>
                    ) : (
                        blackoutDates.map((date) => (
                            <div key={date} className="flex justify-between items-center border p-2 rounded">
                                <span>{new Date(date).toDateString()}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(date)}
                                    disabled={loading}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
