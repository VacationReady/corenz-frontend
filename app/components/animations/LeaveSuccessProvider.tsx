"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import LeaveRequestSuccessAnimation from "./LeaveRequestSuccessAnimation";

interface LeaveSuccessData {
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isAutoApproved: boolean;
}

interface LeaveSuccessContextType {
  showSuccess: (data: LeaveSuccessData) => void;
}

const LeaveSuccessContext = createContext<LeaveSuccessContextType | null>(null);

export function useLeaveSuccess() {
  const context = useContext(LeaveSuccessContext);
  if (!context) {
    throw new Error("useLeaveSuccess must be used within a LeaveSuccessProvider");
  }
  return context;
}

export function LeaveSuccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [successData, setSuccessData] = useState<LeaveSuccessData | null>(null);

  const showSuccess = useCallback((data: LeaveSuccessData) => {
    setSuccessData(data);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow exit animation
    setTimeout(() => setSuccessData(null), 300);
  }, []);

  return (
    <LeaveSuccessContext.Provider value={{ showSuccess }}>
      {children}
      <LeaveRequestSuccessAnimation
        isOpen={isOpen}
        onClose={handleClose}
        leaveType={successData?.leaveType ?? ""}
        startDate={successData?.startDate ?? ""}
        endDate={successData?.endDate ?? ""}
        totalDays={successData?.totalDays ?? 0}
        isAutoApproved={successData?.isAutoApproved ?? false}
      />
    </LeaveSuccessContext.Provider>
  );
}
