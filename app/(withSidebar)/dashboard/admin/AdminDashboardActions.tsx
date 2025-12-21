"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User, Mail, Bot } from "lucide-react";
import EmailEmployeeModal from "@/components/employees/EmailEmployeeModal";

interface AdminDashboardActionsProps {
  employeeId: string;
}

export default function AdminDashboardActions({ employeeId }: AdminDashboardActionsProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Link href={`/employees/${employeeId}/overview`}>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
            <User className="h-4 w-4 mr-2" /> View profile
          </Button>
        </Link>
        {/* Email Employee - opens modern modal */}
        <Button
          onClick={() => setEmailModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium"
        >
          <Mail className="h-4 w-4 mr-2" /> Email Employee
        </Button>
        {/* AI Chatbot */}
        <Link href="/assistant">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
            <Bot className="h-4 w-4 mr-2" /> AI Chatbot
          </Button>
        </Link>
      </div>

      <EmailEmployeeModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
      />
    </>
  );
}
