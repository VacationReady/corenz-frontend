"use client";

import { useState } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import {
  Megaphone,
  FileText,
  Mail,
  Users,
  ClipboardList,
  CalendarCheck2,
  UserPlus,
} from "lucide-react";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import AddDocumentModal from "@/components/documents/AddDocumentModal";

interface AdminDashboardClientProps {
  employeeId: string;
  firstName: string;
}

export default function AdminDashboardClient({
  employeeId,
  firstName,
}: AdminDashboardClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);

  const actions = [
    { label: "Post News", icon: FileText },
    { label: "Add Employee", icon: UserPlus },
    { label: "Add Document", icon: FileText },
    { label: "Email Employee", icon: Mail },
  ];

  return (
    <>
      {/* Quick Actions */}
      <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                if (label === "Add Employee") setModalOpen(true);
                if (label === "Add Document") setAddDocumentOpen(true);
              }}
              className="flex flex-col items-center justify-center bg-section-background border border-enhanced rounded-lg p-4 hover:bg-accent hover:shadow-sm transition-smooth hover-lift group"
            >
              <Icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-smooth" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </DashboardWidget>

      {/* People Metrics */}
      <DashboardWidget title="People Metrics" icon={Users} className="h-full">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Active Employees</span>
            <span className="text-2xl font-bold text-foreground">46</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Managers</span>
            <span className="text-2xl font-bold text-foreground">5</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">New Starters This Month</span>
            <span className="text-2xl font-bold text-primary">3</span>
          </div>
        </div>
      </DashboardWidget>

      {/* Pending Approvals */}
      <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
        <div className="text-center">
          <p className="text-5xl font-bold text-primary mb-2">7</p>
          <p className="text-muted-foreground">Awaiting your approval</p>
          <div className="mt-4 pt-4 border-t border-enhanced">
            <button className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth">
              View All →
            </button>
          </div>
        </div>
      </DashboardWidget>

      {/* Who's Off */}
      <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-4">Loading leave data...</p>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </DashboardWidget>

      {/* News Widget */}
      <NewsWidget />

      {/* Modals */}
      <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AddDocumentModal open={addDocumentOpen} onClose={() => setAddDocumentOpen(false)} />
    </>
  );
}
