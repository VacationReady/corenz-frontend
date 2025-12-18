import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen w-full flex items-center justify-center p-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
          tabIndex={-1}
          autoFocus
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
              aria-hidden="true"
            />
            <p className="text-sm text-gray-700">Loading login…</p>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
