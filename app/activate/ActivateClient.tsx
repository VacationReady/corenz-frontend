"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, LifeBuoy, Check, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { FullScreenHeader } from "@/components/ui/FullScreenHeader";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Success animation sparkle positions
const sparkles = [
  { top: '8%', left: '15%', delay: 0, size: 'h-2 w-2' },
  { top: '15%', right: '12%', delay: 0.1, size: 'h-3 w-3' },
  { top: '25%', left: '8%', delay: 0.2, size: 'h-2.5 w-2.5' },
  { bottom: '25%', right: '10%', delay: 0.15, size: 'h-2 w-2' },
  { bottom: '15%', left: '20%', delay: 0.25, size: 'h-3 w-3' },
  { bottom: '8%', right: '18%', delay: 0.3, size: 'h-2 w-2' },
];

function PasswordSetSuccessAnimation({ isOpen }: { isOpen: boolean }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="password-success"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Animated gradient background orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tl from-cyan-500/20 to-blue-500/10 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          <motion.div
            className="relative w-full max-w-md mx-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-[0_50px_150px_-30px_rgba(16,185,129,0.4)]"
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              transition: {
                type: 'spring',
                stiffness: 200,
                damping: 20,
                mass: 0.8,
              },
            }}
            exit={{ scale: 0.9, opacity: 0, y: -20, transition: { duration: 0.25 } }}
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
            
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5" />

            <div className="relative px-8 py-12 text-center">
              {/* Animated Shield Icon */}
              <motion.div
                className="mx-auto mb-8 relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 14 }}
              >
                {/* Pulsing rings */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    className="absolute w-28 h-28 rounded-full border-2 border-emerald-400/40"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.6, 0, 0.6],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute w-28 h-28 rounded-full border-2 border-teal-400/30"
                    animate={{
                      scale: [1, 1.6, 1],
                      opacity: [0.4, 0, 0.4],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                  />
                </motion.div>

                {/* Main icon container */}
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_20px_60px_-20px_rgba(16,185,129,0.8)]">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <ShieldCheck className="h-12 w-12 text-white" strokeWidth={2} />
                  </motion.div>
                  
                  {/* Checkmark overlay */}
                  <motion.div
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Check className="h-5 w-5 text-emerald-600" strokeWidth={3} />
                  </motion.div>
                </div>
              </motion.div>

              {/* Success Title */}
              <motion.h2
                className="mb-3 text-3xl font-bold tracking-tight text-white"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
              >
                Password Set!
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                className="mb-8 text-lg text-slate-300/90"
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
              >
                Your account is now activated
              </motion.p>

              {/* Redirecting indicator */}
              <motion.div
                className="inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-emerald-300"
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
              >
                {/* Animated loading dots */}
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">Redirecting to login now...</span>
              </motion.div>

              {/* Decorative sparkles icon */}
              <motion.div
                className="mt-6 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-5 w-5 text-slate-500" />
                </motion.div>
              </motion.div>
            </div>

            {/* Floating sparkles */}
            {sparkles.map((sparkle, index) => (
              <motion.span
                key={index}
                className={`absolute ${sparkle.size} rounded-full bg-gradient-to-br from-emerald-300 to-teal-400`}
                style={{ top: sparkle.top, left: sparkle.left, right: sparkle.right, bottom: sparkle.bottom }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.2, 0.8, 1],
                  opacity: [0, 1, 0.8, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: sparkle.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ActivateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const companyId = searchParams?.get("companyId") ?? "";

  const { branding } = useTenantBranding();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const supportHref = useMemo(() => {
    const email = "support@peoplecore.co.nz";
    return `mailto:${email}`;
  }, []);

  const brandName = branding.shortName || branding.name || "Your";
  const brandInitials =
    branding.initials || (branding.name ? branding.name.slice(0, 2).toUpperCase() : "YR");
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
  const missingRequirements = useMemo(() => {
    const requirements: string[] = [];
    if (!hasMinLength) requirements.push("at least 6 characters");
    if (!hasUppercase) requirements.push("an uppercase letter (A–Z)");
    if (!hasNumber) requirements.push("a number (0–9)");
    if (!hasSpecial) requirements.push("a special character (!@#$% etc.)");
    if (!passwordsMatch) requirements.push("matching passwords");
    return requirements;
  }, [hasMinLength, hasUppercase, hasNumber, hasSpecial, passwordsMatch]);

  useEffect(() => {
    if (!token) {
      setError("Activation token is missing. Please check your email link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        body: JSON.stringify({ token, password, companyId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");

      // Show success animation
      setShowSuccess(true);
      const target = `/login?next=${encodeURIComponent(redirect)}`;
      // Give time for animation before redirect
      setTimeout(() => router.push(target), 2500);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Animation Overlay */}
      <PasswordSetSuccessAnimation isOpen={showSuccess} />

      <FullScreenHeader
        backSlot={
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
            aria-label="Back to login"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            <span>Back to login</span>
          </Link>
        }
        title={<span>{activationHeadline}</span>}
        helpSlot={
          <a href={supportHref} className="focus-visible:outline-none">
            <span className="flex items-center gap-2">
              <LifeBuoy aria-hidden className="h-4 w-4" />
              Need help?
            </span>
          </a>
        }
      >
        <p className="text-sm text-muted-foreground">
          Set a secure password to finish activating your account and jump back into
          {` ${brandName}`} portal.
        </p>
      </FullScreenHeader>

      <div className="mx-auto flex w-full max-w-5xl justify-center px-4 pb-12 pt-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
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
            <p className="mt-4 text-sm text-muted-foreground">
              Choose a password that meets the requirements below to keep your account safe.
            </p>
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
            {missingRequirements.length && !loading ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">
                      <button
                        type="submit"
                        className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
                        disabled
                        aria-disabled
                      >
                        Set Password
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] space-y-1 text-left text-xs">
                    <p className="font-semibold">Finish the checklist to enable Set Password:</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {missingRequirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
                disabled={loading || !meetsAllRequirements}
              >
                {loading ? "Submitting..." : "Set Password"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
