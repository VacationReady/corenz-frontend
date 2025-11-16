"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function TenantSwitchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing tenant switch...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing switch token");
      return;
    }

    const processSwitch = async () => {
      try {
        const response = await fetch("/api/tenant-admin/process-switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "Failed to process switch");
          return;
        }

        // Use NextAuth credentials provider with the temporary credentials
        const result = await signIn("credentials", {
          email: data.email,
          password: data.tempPassword,
          redirect: false,
        });

        if (result?.error) {
          setStatus("error");
          setMessage("Authentication failed");
          return;
        }

        // Force a hard redirect to ensure session cookies are properly set
        setStatus("success");
        setMessage(`Switched to ${data.companyName}. Redirecting...`);
        
        // Use a hard navigation to ensure cookies and session are fully refreshed
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } catch (error) {
        console.error("Switch error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    processSwitch();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="glass rounded-3xl p-8 shadow-glass text-center max-w-md">
        {status === "processing" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-foreground">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-foreground font-semibold">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-foreground font-semibold text-red-600">{message}</p>
            <button
              onClick={() => router.push("/tenant-admin")}
              className="mt-4 rounded-xl bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
            >
              Back to Admin Portal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
