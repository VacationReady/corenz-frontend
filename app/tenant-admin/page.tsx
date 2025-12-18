"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function TenantAdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const postLoginPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) return "/tenant-admin/dashboard";

    if (next.startsWith("/tenant-admin")) {
      return next;
    }

    return "/tenant-admin/dashboard";
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/tenant-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Invalid password");
        setIsLoading(false);
        return;
      }

      toast.success("Access granted");
      router.push(postLoginPath);
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-glass">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <Lock className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Tenant Admin Portal
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the admin password to manage tenants
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-foreground shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter password"
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={!password}
            >
              Access Portal
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              This portal is for system administrators only.
              <br />
              All actions are logged and monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
