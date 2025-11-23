"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Button from "@/components/ui/Button";
import { Calendar, ShieldBan, User } from "lucide-react";
import { format } from "date-fns";
import QuickLeaveBookingModal from "./QuickLeaveBookingModal";

interface DayActionSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedDate: Date | null;
  onBlockDay: () => void;
  onBookLeave: () => void;
  refreshCalendar?: () => void;
}

export default function DayActionSheet({
  open,
  setOpen,
  selectedDate,
  onBlockDay,
  onBookLeave,
  refreshCalendar,
}: DayActionSheetProps) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const handleBlockDay = () => {
    setOpen(false);
    onBlockDay();
  };

  const handleBookLeave = () => {
    setOpen(false);
    setShowLeaveModal(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDate ? format(selectedDate, "EEEE, d MMMM yyyy") : "Select Action"}
            </SheetTitle>
            <SheetDescription>
              What would you like to do with this day?
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 mb-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBookLeave}
              className="h-auto py-6 flex-col gap-3 hover:bg-primary/5 hover:border-primary"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600">
                <User className="w-6 h-6" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-base">Book Leave</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Book time off for an employee
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleBlockDay}
              className="h-auto py-6 flex-col gap-3 hover:bg-red-50 hover:border-red-300"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
                <ShieldBan className="w-6 h-6" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-base">Block Day</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Prevent leave bookings for this day
                </div>
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <QuickLeaveBookingModal
        open={showLeaveModal}
        setOpen={setShowLeaveModal}
        defaultStartDate={selectedDate}
        defaultEndDate={selectedDate}
        onSubmitted={() => {
          onBookLeave();
          refreshCalendar?.();
        }}
      />
    </>
  );
}

