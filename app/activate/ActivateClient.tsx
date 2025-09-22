"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTenantBranding } from "@/components/TenantBrandingProvider";

export default function ActivateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const { branding } = useTenantBranding();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const brandName = branding.shortName || branding.name;
  const brandInitials = branding.initials || brandName.slice(0, 2).toUpperCase();
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;
  const activationHeadline = `Activate Your ${brandName} Account`;
  const activationSubtitle = `Set your password to get started with ${brandName}`;

  // Derived validation flags
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const meetsAllRequirements =
    hasMinLength && hasUppercase && hasNumber && hasSpecial && passwordsMatch;

  useEffect(() => {
    if (!token) {
      setError("Activation token is missing. Please check your email link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) return setError("Missing activation token.");
    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial)
      return setError(
        "Password must be at least 6 characters and include an uppercase letter, a number, and a special character.",
      );
    if (!passwordsMatch) return setError("Passwords do not match.");

    try {
      setLoading(true);
      const res = await fetch("/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");

      setSuccess("Password set! Redirecting...");
      const target = `/login?next=${encodeURIComponent(redirect)}`;
      setTimeout(() => router.push(target), 1500);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {brandLogo ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandLogo}
                  alt={`${brandName} logo`}
                  className="h-10 w-10 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white text-xl font-semibold">
                {brandInitials}
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{activationHeadline}</h1>
          <p className="text-sm text-gray-500">{activationSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {/* Real-time password requirements */}
          <div className="text-sm">
            <div className="mb-1 font-medium">Password requirements:</div>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={hasMinLength ? "text-green-600" : "text-gray-400"}
                >
                  {hasMinLength ? "✓" : "○"}
                </span>
                At least 6 characters
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={hasUppercase ? "text-green-600" : "text-gray-400"}
                >
                  {hasUppercase ? "✓" : "○"}
                </span>
                Contains an uppercase letter (A–Z)
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={hasNumber ? "text-green-600" : "text-gray-400"}
                >
                  {hasNumber ? "✓" : "○"}
                </span>
                Contains a number (0–9)
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={hasSpecial ? "text-green-600" : "text-gray-400"}
                >
                  {hasSpecial ? "✓" : "○"}
                </span>
                Contains a special character (!@#$% etc.)
              </li>
              <li className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={passwordsMatch ? "text-green-600" : "text-gray-400"}
                >
                  {passwordsMatch ? "✓" : "○"}
                </span>
                Passwords match
              </li>
            </ul>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
            disabled={loading || !meetsAllRequirements}
          >
            {loading ? "Submitting..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
