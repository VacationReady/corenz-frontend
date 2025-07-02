"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useState, useEffect } from "react";

interface EventCategory {
    id: string;
    name: string;
}

interface LeaveEntitlement {
    id: string;
    employeeId: string;
    eventCategoryId: string;
    totalDays: number;
    usedDays: number;
    createdAt: Date;
    updatedAt: Date;
    eventCategory: EventCategory;
}

export default function EditEntitlementModal({
    open,
    setOpen,
    employeeId,
    currentEntitlements,
    refresh,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    employeeId: string;
    currentEntitlements: LeaveEntitlement[];
    refresh: () => void;
}) {
    const [annualLeave, setAnnualLeave] = useState(20);
    const [sickLeave, setSickLeave] = useState(10);
    const [bereavement, setBereavement] = useState(3);
    const [loading, setLoading] = useState(false);
    const [eventCategoryMap, setEventCategoryMap] = useState<Record<string, string>>({});

    // Derived flag: true once we've loaded at least those three IDs
    const mapReady = !!(
        eventCategoryMap["ANNUAL"] &&
        eventCategoryMap["SICK"] &&
        eventCategoryMap["BEREAVEMENT"]
    );

    useEffect(() => {
        const fetchEventCategories = async () => {
            try {
                const res = await fetch("/api/event-categories");
                const data: EventCategory[] = await res.json();

                const categoryMap: Record<string, string> = {};
                data.forEach((cat) => {
                    if (cat.name === "Annual Leave") categoryMap["ANNUAL"] = cat.id;
                    if (cat.name === "Sick Leave") categoryMap["SICK"] = cat.id;
                    if (cat.name === "Bereavement Leave") categoryMap["BEREAVEMENT"] = cat.id;
                });
                setEventCategoryMap(categoryMap);
            } catch (error) {
                console.error("Failed to fetch event categories", error);
            }
        };

        fetchEventCategories();
    }, []);

    useEffect(() => {
        if (currentEntitlements) {
            const annual = currentEntitlements.find(
                (e) => e.eventCategory.name === "Annual Leave"
            )?.totalDays;
            const sick = currentEntitlements.find(
                (e) => e.eventCategory.name === "Sick Leave"
            )?.totalDays;
            const bereave = currentEntitlements.find(
                (e) => e.eventCategory.name === "Bereavement Leave"
            )?.totalDays;

            if (annual !== undefined) setAnnualLeave(annual);
            if (sick !== undefined) setSickLeave(sick);
            if (bereave !== undefined) setBereavement(bereave);
        }
    }, [currentEntitlements]);

    const handleSubmit = async () => {
        // 🚧 Guard against missing IDs
        if (!mapReady) {
            alert("Event categories are still loading. Please wait a moment and try again.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}/entitlement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([
                    { eventCategoryId: eventCategoryMap["ANNUAL"], totalDays: annualLeave },
                    { eventCategoryId: eventCategoryMap["SICK"], totalDays: sickLeave },
                    { eventCategoryId: eventCategoryMap["BEREAVEMENT"], totalDays: bereavement },
                ]),
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
                    <Button disabled={loading || !mapReady} onClick={handleSubmit}>
                        {loading ? "Saving..." : "Save Entitlement"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
