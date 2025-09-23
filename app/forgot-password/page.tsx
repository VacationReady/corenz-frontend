"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFormError("Enter a valid work email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error || "We couldn&apos;t start a reset just now. Try again soon.";
        setFormError(message);
        toast({
          title: "Couldn&apos;t send reset email",
          description: message,
          variant: "destructive",
        });
        return;
      }

      setSubmitted(true);
      toast({
        title: "Check your inbox",
        description:
          "If the email matches an account, you&apos;ll receive password reset instructions shortly.",
      });
    } catch (error) {
      console.error("Forgot password request failed", error);
      const message = "We couldn&apos;t reach the server. Please try again.";
      setFormError(message);
      toast({
        title: "Network error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12 dark:bg-surface-dark">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm transition-colors dark:bg-surface-dark">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            We&apos;ll email you a link to choose a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="email">
              Work email
            </label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading || submitted}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}

          {submitted && !formError && (
            <p className="text-sm text-green-600" role="status">
              Check your inbox for a reset link. It may take a minute to arrive.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={submitted}
            loadingText="Sending reset link"
            icon={<Send className="h-4 w-4" />}
          >
            Send reset link
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-dark"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

