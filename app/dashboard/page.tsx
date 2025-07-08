"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Read role from data attribute injected by the layout
    const roleAttr = document.querySelector("[data-role]")?.getAttribute("data-role");
    setRole(roleAttr ?? null);
  }, []);

  const handleRunCarryover = async () => {
    try {
      const res = await fetch("/api/run-carryover", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Carryover processed successfully.");
      } else {
        console.error(data.error);
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    }
  };

  const handleRunExpiryAlerts = async () => {
    try {
      const res = await fetch("/api/cron/send-expiry-alerts", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.message) {
        toast.success("Expiry alerts sent successfully.");
      } else {
        console.error(data.error);
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred while sending expiry alerts.");
    }
  };

  if (!role) {
    return <p className="p-4">Loading...</p>;
  }

  if (role === "ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-10 p-4 text-center space-y-4">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">
          Use the buttons below to manually trigger processes.
        </p>
        <div className="space-y-2">
          <Button onClick={handleRunCarryover}>Run Carryover</Button>
          <Button onClick={handleRunExpiryAlerts} variant="ghost">
            Test Alerts
          </Button>
        </div>
      </div>
    );
  }

  if (role === "MANAGER") {
    router.replace("/dashboard/manager");
    return null;
  } else {
    router.replace("/dashboard/employee");
    return null;
  }
}
