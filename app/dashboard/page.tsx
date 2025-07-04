"use client";

import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

export default function DashboardPage() {
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getServerSession(authOptions as NextAuthOptions);
      setRole(session?.user?.role);
    };
    fetchSession();
  }, []);

  const handleRunCarryover = async () => {
    try {
      const res = await fetch("/api/admin/run-carryover", {
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

  if (!role) {
    return <p className="p-4">Loading...</p>;
  }

  if (role === "ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-10 p-4 text-center space-y-4">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">
          Use the button below to manually trigger the annual carryover process.
        </p>
        <Button onClick={handleRunCarryover}>Run Carryover</Button>
      </div>
    );
  }

  if (role === "MANAGER") {
    redirect("/dashboard/manager");
  } else {
    redirect("/dashboard/employee");
  }
}
