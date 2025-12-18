"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowLeft, LifeBuoy, LogIn, RefreshCcw } from "lucide-react";

import Button from "@/components/ui/Button";
import { getLogoutCallbackUrl } from "@/lib/logout-url";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-xl p-8 rounded-2xl max-w-md text-center">
        {/* Padlock Icon */}
        <div className="flex justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 10V7a4 4 0 00-8 0v3M5 10h14v10H5V10z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500">
          You don’t have permission to view this page. This can happen if your session expired,
          you signed in with the wrong account, or your role doesn’t allow access.
        </p>

        <div className="mt-6 grid gap-3">
          <Button asChild icon={<LogIn className="h-4 w-4" />}>
            <Link href="/login">Back to login</Link>
          </Button>

          <Button asChild variant="secondary">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.back()}
            >
              Go back
            </Button>

            <Button
              type="button"
              variant="outline"
              icon={<RefreshCcw className="h-4 w-4" />}
              onClick={() => {
                void signOut({ callbackUrl: getLogoutCallbackUrl() });
              }}
            >
              Switch account
            </Button>
          </div>

          <a
            href="https://support.peoplecore.co"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
