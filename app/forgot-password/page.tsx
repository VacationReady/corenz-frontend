"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 10;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const requestReset = async (emailToSend: string) => {
    if (loading) return;
    if (cooldownSeconds > 0) {
      toast({
        title: "Please wait",
        description: `You can resend in ${cooldownSeconds}s.`,
      });
      return;
    }

    setFormError(null);

    const trimmedEmail = emailToSend.trim();
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
      setLastSentEmail(trimmedEmail);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await requestReset(email);
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
              onChange={(event) => {
                setEmail(event.target.value);
                if (formError) setFormError(null);
              }}
              required
              disabled={loading}
              ref={emailInputRef}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}

          {submitted && !formError && (
            <p className="text-sm text-green-600" role="status">
              Check your inbox for a reset link{lastSentEmail ? ` (sent to ${lastSentEmail})` : ""}. It may take a minute
              to arrive.
            </p>
          )}

          {submitted && cooldownSeconds > 0 && !formError && (
            <p className="text-xs text-gray-500" role="status">
              You can resend in {cooldownSeconds}s.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={cooldownSeconds > 0}
            loadingText="Sending reset link"
            icon={<Send className="h-4 w-4" />}
          >
            {submitted ? "Send again" : "Send reset link"}
          </Button>

          {submitted && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={cooldownSeconds > 0}
                onClick={() => requestReset(lastSentEmail ?? email)}
              >
                Resend email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setFormError(null);
                  setSubmitted(false);
                  setLastSentEmail(null);
                  setCooldownSeconds(0);
                  queueMicrotask(() => emailInputRef.current?.focus());
                }}
              >
                Use a different email
              </Button>
            </div>
          )}
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

