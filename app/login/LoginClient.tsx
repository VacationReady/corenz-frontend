"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
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

  const brandName = branding.shortName || branding.name;
  const logoSrc = branding.logoUrl || branding.squareLogoUrl || null;
  const loginHeading = branding.loginHeadline?.trim() || brandName;
  const loginSubtitle =
    branding.loginSubtitle?.trim() || `Sign in to your ${brandName} account`;

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

        if (role === "ADMIN") {
          router.push("/dashboard/admin");
        } else if (role === "MANAGER") {
          router.push("/dashboard/manager");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError("Invalid email or password");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface dark:bg-surface-dark px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-sm transition-colors">
        <div className="mb-6 text-center">
          {logoSrc ? (
            <div className="mb-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={`${brandName} logo`}
                className="h-12 w-auto"
              />
            </div>
          ) : null}
          <h1 className="text-2xl font-bold text-primary">{loginHeading}</h1>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
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
          <span className="mx-4 text-sm text-gray-500 dark:text-gray-400">Or</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2 bg-white dark:bg-gray-800"
            onClick={() => signIn("azure-ad")}
          >
            <MicrosoftIcon />
            Log in with Microsoft
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 bg-white dark:bg-gray-800"
            onClick={() => signIn("google")}
          >
            <FcGoogle className="h-5 w-5" />
            Log in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
