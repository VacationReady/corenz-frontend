"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, FormEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useTenantBranding } from "@/components/TenantBrandingProvider";

const MicrosoftIcon = () => (
  <span className="grid h-5 w-5 grid-cols-2 gap-[2px]">
    <span className="bg-[#F35325]" />
    <span className="bg-[#81BC06]" />
    <span className="bg-[#05A6F0]" />
    <span className="bg-[#FFBA08]" />
  </span>
);

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const { branding } = useTenantBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<"azure-ad" | "google" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const brandName = branding.shortName || branding.name;
  const logoSrc = branding.logoUrl || branding.squareLogoUrl || null;
  const loginSubtitle =
    branding.loginSubtitle?.trim() ||
    `Please log into your ${brandName} account`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("lastLoginEmail");
      if (saved) setEmail(saved);
    } catch { }
  }, []);

  useEffect(() => {
    const urlError = search?.get("error");
    if (!urlError) return;
    const message =
      urlError === "OAuthAccountNotLinked"
        ? "This email is already linked to a different sign-in method. Please use that provider or contact support."
        : urlError === "AccessDenied"
          ? "Access denied. Please contact your administrator."
          : "Unable to sign in. Please try again.";
    setError(message);
  }, [search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const role = session?.user?.role;
        const next = search?.get("next");

        if (next) {
          router.push(next);
          return;
        }

        // If user has an active onboarding instance, redirect to their in-progress step
        try {
          const userId = session?.user?.id as string | undefined;
          const companyScopedEmployee = async (): Promise<string | null> => {
            if (!userId) return null;
            const resp = await fetch(`/api/employees?status=active&userId=${encodeURIComponent(userId)}`);
            if (!resp.ok) return null;
            const list = await resp.json();
            const first = Array.isArray(list) ? list[0] : null;
            return first?.id || null;
          };

          const empId = await companyScopedEmployee();
          if (empId) {
            const onboardingRes = await fetch(`/api/onboarding/instances/employee/${empId}`);
            if (onboardingRes.ok) {
              const instances = await onboardingRes.json();
              const latest = Array.isArray(instances) ? instances[0] : null;
              const hasActive = latest?.OnboardingStepInstance?.some((s: any) => s.status !== "completed");
              if (hasActive) {
                router.push(`/${empId}/onboarding`);
                return;
              }
            }
          }
        } catch { }

        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          router.push("/dashboard/admin");
        } else if (role === "MANAGER") {
          router.push("/dashboard/manager");
        } else {
          router.push("/dashboard");
        }
      } else {
        const message =
          res?.error === "CredentialsSignin"
            ? "Invalid email or password"
            : res?.error === "OAuthAccountNotLinked"
              ? "This email is already linked to a different sign-in method. Please use that provider or contact support."
              : res?.error === "AccessDenied"
                ? "Access denied. Please contact your administrator."
                : "Unable to sign in. Please try again.";
        setError(message);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    try {
      window.localStorage.setItem("lastLoginEmail", value);
    } catch { }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-3xl p-8 transition-all duration-700 ease-out"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.15), 0 30px 80px -30px rgba(59, 130, 246, 0.2), inset 0 2px 8px rgba(255, 255, 255, 0.6), inset 0 -2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="mb-6 text-center">
          {logoSrc ? (
            <div className="mb-6 flex justify-center">
              {/* Premium Logo Container with Gradient Glow */}
              <div className="group relative">
                {/* Glow effect behind logo */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-50 blur-xl transition-all duration-500 group-hover:opacity-70 group-hover:blur-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(168, 85, 247, 0.3), rgba(20, 184, 166, 0.3))',
                    transform: 'scale(1.1)'
                  }}
                />

                {/* Logo container with premium glassmorphism */}
                <div
                  className="relative rounded-2xl p-4 transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.4)'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc}
                    alt={`${brandName} logo`}
                    className="h-10 w-auto transition-all duration-300 group-hover:brightness-110"
                  />
                </div>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-primary">{brandName}</h1>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {loginSubtitle}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading || !!ssoLoading}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                placeholder="••••••••"
                required
                disabled={loading || !!ssoLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword((s) => !s)}
                disabled={loading || !!ssoLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {capsOn && (
              <p className="mt-1 text-xs text-amber-600">Caps Lock is on</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
            }}
            loading={loading}
            loadingText="Signing in"
            icon={<LogIn className="h-4 w-4" />}
            disabled={loading || !!ssoLoading}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-dark"
          >
            Forgot password?
          </Link>
        </div>

        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="mx-4 text-sm text-gray-500 dark:text-gray-400">
            Or
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => {
              if (loading || ssoLoading) return;
              setSsoLoading("azure-ad");
              setError("");
              signIn("azure-ad");
            }}
            loading={ssoLoading === "azure-ad"}
            disabled={loading || ssoLoading === "google"}
          >
            <MicrosoftIcon />
            {ssoLoading === "azure-ad" ? "Redirecting…" : "Log in with Microsoft"}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => {
              if (loading || ssoLoading) return;
              setSsoLoading("google");
              setError("");
              signIn("google");
            }}
            loading={ssoLoading === "google"}
            disabled={loading || ssoLoading === "azure-ad"}
          >
            <FcGoogle className="h-5 w-5" />
            {ssoLoading === "google" ? "Redirecting…" : "Log in with Google"}
          </Button>
        </div>
      </div>
    </div>
  );
}
