"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, LifeBuoy, Check, ShieldCheck, Sparkles, Eye, EyeOff, Lock, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useTenantBranding } from "@/components/TenantBrandingProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Success animation sparkle positions
const sparkles = [
  { top: '8%', left: '15%', delay: 0, size: 'h-2 w-2' },
  { top: '15%', right: '12%', delay: 0.1, size: 'h-3 w-3' },
  { top: '25%', left: '8%', delay: 0.2, size: 'h-2.5 w-2.5' },
  { bottom: '25%', right: '10%', delay: 0.15, size: 'h-2 w-2' },
  { bottom: '15%', left: '20%', delay: 0.25, size: 'h-3 w-3' },
  { bottom: '8%', right: '18%', delay: 0.3, size: 'h-2 w-2' },
];

// Floating orbs configuration
const floatingOrbs = [
  { size: 400, x: '10%', y: '20%', color: 'from-blue-400/30 to-cyan-400/20', duration: 20, delay: 0 },
  { size: 300, x: '70%', y: '60%', color: 'from-violet-400/25 to-purple-400/15', duration: 25, delay: 2 },
  { size: 250, x: '80%', y: '10%', color: 'from-emerald-400/20 to-teal-400/15', duration: 22, delay: 4 },
  { size: 350, x: '20%', y: '70%', color: 'from-pink-400/20 to-rose-400/15', duration: 28, delay: 1 },
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
                {mode === "reset" ? "Your password has been updated" : "Your account is now activated"}
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

// Password requirement component with animation
function PasswordRequirement({ 
  met, 
  text, 
  delay = 0 
}: { 
  met: boolean; 
  text: string; 
  delay?: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-2.5 py-1"
    >
      <motion.div
        key={met ? 'met' : 'unmet'}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ 
          scale: 1,
          opacity: 1,
          rotate: met ? [0, 10, 0] : 0 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {met ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow-sm" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
        )}
      </motion.div>
      <span className={cn(
        "text-sm transition-all duration-200",
        met 
          ? "text-emerald-600 dark:text-emerald-400 font-medium" 
          : "text-slate-500 dark:text-slate-400"
      )}>
        {text}
      </span>
    </motion.li>
  );
}

// Password strength meter
function PasswordStrengthMeter({ strength }: { strength: number }) {
  const segments = [
    { threshold: 1, color: 'bg-rose-500', label: 'Weak' },
    { threshold: 2, color: 'bg-orange-500', label: 'Fair' },
    { threshold: 3, color: 'bg-amber-500', label: 'Good' },
    { threshold: 4, color: 'bg-emerald-400', label: 'Strong' },
    { threshold: 5, color: 'bg-emerald-500', label: 'Excellent' },
  ];

  const activeSegment = segments.find((s, i) => i === strength - 1) || segments[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <motion.div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              level <= strength 
                ? activeSegment.color 
                : "bg-slate-200 dark:bg-slate-700"
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: level * 0.05, duration: 0.2 }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {strength > 0 && (
          <motion.p
            key={strength}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              "text-xs font-medium transition-colors",
              strength <= 1 && "text-rose-600",
              strength === 2 && "text-orange-600",
              strength === 3 && "text-amber-600",
              strength >= 4 && "text-emerald-600"
            )}
          >
            {activeSegment.label}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ActivateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const modeParam = searchParams?.get("mode") ?? "";
  const mode: "activate" | "reset" = modeParam === "reset" ? "reset" : "activate";
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const companyId = searchParams?.get("companyId") ?? "";

  const { branding } = useTenantBranding();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<'password' | 'confirm' | null>(null);

  const supportHref = useMemo(() => {
    const email = "support@peoplecore.co.nz";
    return `mailto:${email}`;
  }, []);

  const brandName = branding.shortName || branding.name || "Your";
  const brandInitials =
    branding.initials || (branding.name ? branding.name.slice(0, 2).toUpperCase() : "YR");
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;
  const activationHeadline =
    mode === "reset"
      ? `Reset Your ${brandName} Password`
      : `Activate Your ${brandName} Account`;

  // Derived validation flags
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const meetsAllRequirements =
    hasMinLength && hasUppercase && hasNumber && hasSpecial && passwordsMatch;

  // Calculate password strength (0-5)
  const passwordStrength = useMemo(() => {
    let strength = 0;
    if (hasMinLength) strength++;
    if (hasUppercase) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;
    if (password.length >= 12) strength++;
    return strength;
  }, [hasMinLength, hasUppercase, hasNumber, hasSpecial, password.length]);

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
      setError(
        mode === "reset"
          ? "Reset token is missing. Please check your email link."
          : "Activation token is missing. Please check your email link.",
      );
    }
  }, [token, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      return setError(mode === "reset" ? "Missing reset token." : "Missing activation token.");
    }
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
        body: JSON.stringify({ token, password, companyId, mode }),
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Floating gradient orbs */}
      {floatingOrbs.map((orb, index) => (
        <motion.div
          key={index}
          className={cn(
            "fixed rounded-full blur-3xl pointer-events-none bg-gradient-to-br",
            orb.color
          )}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Mesh gradient overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/20 via-transparent to-transparent dark:from-blue-500/5 pointer-events-none" />

      {/* Success Animation Overlay */}
      <PasswordSetSuccessAnimation isOpen={showSuccess} />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full border-b border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full px-3 py-1.5 hover:bg-white/50 dark:hover:bg-white/10"
            aria-label="Back to login"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            <span>Back to login</span>
          </Link>
          <a 
            href={supportHref} 
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors rounded-full px-3 py-1.5 hover:bg-primary/10"
          >
            <LifeBuoy aria-hidden className="h-4 w-4" />
            Need help?
          </a>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 py-12 sm:py-16">
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Glass card */}
          <div className="relative overflow-hidden rounded-3xl glass-premium shadow-depth-5">
            {/* Top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />
            
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 opacity-30 pointer-events-none"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }}
            />

            <div className="relative p-8 sm:p-10">
              {/* Brand logo/initials */}
              <motion.div 
                className="flex justify-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                {brandLogo ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brandLogo}
                      alt={`${brandName} logo`}
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white text-xl font-bold shadow-lg">
                    {brandInitials}
                  </div>
                )}
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {activationHeadline}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  {mode === "reset"
                    ? "Create a new secure password to continue"
                    : "Create a secure password to get started"}
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                {/* Password field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none transition-colors duration-200",
                      focusedField === 'password' ? "text-primary" : "text-slate-400"
                    )}>
                      <KeyRound className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      className={cn(
                        "w-full h-12 pl-11 pr-11 rounded-xl border bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm",
                        "text-slate-900 dark:text-white placeholder-slate-400",
                        "transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        focusedField === 'password' 
                          ? "border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" 
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password strength meter */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PasswordStrengthMeter strength={passwordStrength} />
                  </motion.div>
                )}

                {/* Confirm password field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none transition-colors duration-200",
                      focusedField === 'confirm' ? "text-primary" : "text-slate-400"
                    )}>
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className={cn(
                        "w-full h-12 pl-11 pr-11 rounded-xl border bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm",
                        "text-slate-900 dark:text-white placeholder-slate-400",
                        "transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        focusedField === 'confirm' 
                          ? "border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" 
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirm')}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password match indicator */}
                  <AnimatePresence>
                    {confirmPassword.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={cn(
                          "text-sm flex items-center gap-1.5",
                          passwordsMatch ? "text-emerald-600" : "text-rose-500"
                        )}
                      >
                        {passwordsMatch ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Passwords match</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Passwords do not match</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Password requirements */}
                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-700/50">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Password Requirements
                  </p>
                  <ul className="space-y-0.5">
                    <PasswordRequirement met={hasMinLength} text="At least 6 characters" delay={0} />
                    <PasswordRequirement met={hasUppercase} text="One uppercase letter (A–Z)" delay={0.05} />
                    <PasswordRequirement met={hasNumber} text="One number (0–9)" delay={0.1} />
                    <PasswordRequirement met={hasSpecial} text="One special character (!@#$%)" delay={0.15} />
                  </ul>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4"
                    >
                      <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                {missingRequirements.length > 0 && !loading ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block w-full">
                          <motion.button
                            type="submit"
                            disabled
                            className={cn(
                              "w-full h-12 rounded-xl font-semibold text-white",
                              "bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700",
                              "cursor-not-allowed",
                              "flex items-center justify-center gap-2"
                            )}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Lock className="h-4 w-4" />
                            Set Password
                          </motion.button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-[280px] p-4 rounded-xl bg-slate-900 text-white border-0 shadow-xl"
                        sideOffset={8}
                      >
                        <p className="font-semibold mb-2">Complete the requirements:</p>
                        <ul className="space-y-1 text-sm text-slate-300">
                          {missingRequirements.map((requirement) => (
                            <li key={requirement} className="flex items-center gap-2">
                              <span className="h-1 w-1 rounded-full bg-slate-500" />
                              {requirement}
                            </li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <motion.button
                    type="submit"
                    disabled={loading || !meetsAllRequirements}
                    className={cn(
                      "w-full h-12 rounded-2xl font-semibold text-white relative overflow-hidden",
                      "bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600",
                      "hover:from-blue-500 hover:via-violet-500 hover:to-purple-500",
                      "shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40",
                      "transition-all duration-300",
                      "flex items-center justify-center gap-2",
                      "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
                      "group"
                    )}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </div>
                    {loading ? (
                      <>
                        <motion.div
                          className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Setting Password...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Set Password</span>
                      </>
                    )}
                  </motion.button>
                )}
              </motion.form>
            </div>
          </div>

          {/* Security note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 flex items-center justify-center gap-1.5"
          >
            <Lock className="h-3 w-3" />
            Your connection is secure and encrypted
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
