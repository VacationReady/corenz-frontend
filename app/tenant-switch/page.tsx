"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function TenantSwitchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing tenant switch...");
  const [errorCode, setErrorCode] = useState<
    "missing_token" | "expired" | "used" | "invalid" | "auth_failed" | "network" | "server" | "unknown" | null
  >(null);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);

  const errorContent = useMemo(() => {
    if (!errorCode) {
      return null;
    }

    switch (errorCode) {
      case "missing_token":
        return {
          title: "This switch link is incomplete",
          description:
            "The URL is missing a switch token. Please open the full link from the email, or request a new switch link from the Admin Portal.",
          showRetry: false,
        };
      case "expired":
        return {
          title: "This switch link expired",
          description:
            "Tenant switch links expire for security. Request a new switch link from the Admin Portal and try again.",
          showRetry: true,
        };
      case "used":
        return {
          title: "This switch link has already been used",
          description:
            "For security, each switch link can only be used once. Request a new switch link from the Admin Portal.",
          showRetry: true,
        };
      case "invalid":
        return {
          title: "This switch link is invalid",
          description:
            "The switch token may be incorrect or no longer valid. Request a new switch link from the Admin Portal.",
          showRetry: true,
        };
      case "auth_failed":
        return {
          title: "We couldn’t sign you in",
          description:
            "The tenant switch was processed, but authentication did not complete. Try again. If it keeps failing, return to the Admin Portal and request a new switch link.",
          showRetry: true,
        };
      case "network":
        return {
          title: "Network error",
          description:
            "We couldn’t reach the server. Check your connection and try again.",
          showRetry: true,
        };
      case "server":
        return {
          title: "Server error",
          description:
            "Something went wrong while processing the switch. Try again. If it keeps failing, return to the Admin Portal and request a new switch link.",
          showRetry: true,
        };
      default:
        return {
          title: "Tenant switch failed",
          description:
            "Try again. If it keeps failing, return to the Admin Portal and request a new switch link.",
          showRetry: true,
        };
    }
  }, [errorCode]);

  useEffect(() => {
    if (status === "error") {
      primaryActionRef.current?.focus();
    }
  }, [status, errorCode]);

  const startSwitch = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setErrorCode("missing_token");
      setMessage("Missing switch token");
      return;
    }

    setStatus("processing");
    setErrorCode(null);
    setMessage("Processing tenant switch...");

    try {
      const response = await fetch("/api/tenant-admin/process-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        const rawError = typeof data?.error === "string" ? data.error : "Failed to process switch";

        if (response.status === 410 && /expired/i.test(rawError)) {
          setErrorCode("expired");
        } else if (response.status === 410 && /used/i.test(rawError)) {
          setErrorCode("used");
        } else if (response.status === 404) {
          setErrorCode("invalid");
        } else if (response.status >= 500) {
          setErrorCode("server");
        } else {
          setErrorCode("unknown");
        }

        setStatus("error");
        setMessage(rawError);
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.tempPassword,
        redirect: false,
      });

      if (result?.error) {
        setStatus("error");
        setErrorCode("auth_failed");
        setMessage("Authentication failed");
        return;
      }

      setStatus("success");
      setMessage(`Switched to ${data.companyName}. Redirecting...`);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      console.error("Switch error:", error);
      setStatus("error");
      setErrorCode("network");
      setMessage("An unexpected error occurred");
    }
  }, [token]);

  useEffect(() => {
    startSwitch();
  }, [startSwitch]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div
        className="glass rounded-3xl p-8 shadow-glass text-center max-w-md"
        aria-busy={status === "processing"}
      >
        {status === "processing" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            <p id="tenant-switch-status" className="text-foreground" role="status" aria-live="polite" aria-atomic="true">
              {message}
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p id="tenant-switch-status" className="text-foreground font-semibold" role="status" aria-live="polite" aria-atomic="true">
              {message}
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            {errorContent?.title && (
              <p className="text-foreground font-semibold" role="alert" aria-live="assertive" aria-atomic="true">
                {errorContent.title}
              </p>
            )}
            <p
              id="tenant-switch-status"
              className="text-foreground font-semibold text-red-600"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {message}
            </p>
            {errorContent?.description && (
              <p className="mt-2 text-sm text-muted-foreground" aria-describedby="tenant-switch-status">
                {errorContent.description}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {errorContent?.showRetry && (
                <button
                  ref={primaryActionRef}
                  onClick={startSwitch}
                  className="rounded-xl bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
                  aria-describedby="tenant-switch-status"
                >
                  Try again
                </button>
              )}
              <button
                ref={!errorContent?.showRetry ? primaryActionRef : null}
                onClick={() => router.push("/tenant-admin")}
                className="rounded-xl bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
                aria-describedby="tenant-switch-status"
              >
                Back to Admin Portal
              </button>
              <button
                onClick={() => router.push("/tenant-admin")}
                className="rounded-xl border border-purple-600 px-6 py-2 text-purple-700 hover:bg-purple-50"
                aria-describedby="tenant-switch-status"
              >
                Request a new switch link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TenantSwitchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="glass rounded-3xl p-8 shadow-glass text-center max-w-md">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-foreground" role="status" aria-live="polite" aria-atomic="true">
            Loading...
          </p>
        </div>
      </div>
    }>
      <TenantSwitchContent />
    </Suspense>
  );
}
