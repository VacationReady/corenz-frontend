"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  UserPlus,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Rocket,
} from "lucide-react";

interface SetupResult {
  success: boolean;
  email?: string;
  password?: string;
  companyName?: string;
  alreadyExists?: boolean;
  message?: string;
}

interface Company {
  id: string;
  name: string;
}

export default function SetupAdminClient() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [checkingCompanies, setCheckingCompanies] = useState(true);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Form state
  const [email, setEmail] = useState("uat.admin@peoplecore.co.nz");
  const [firstName, setFirstName] = useState("UAT");
  const [lastName, setLastName] = useState("Administrator");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [useNewCompany, setUseNewCompany] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch available companies on mount
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await fetch("/api/setup-admin/companies");
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.companies || []);
          if (data.companies?.length > 0) {
            setSelectedCompanyId(data.companies[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      } finally {
        setCheckingCompanies(false);
      }
    }
    fetchCompanies();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/setup-admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          companyId: useNewCompany ? null : selectedCompanyId,
          newCompanyName: useNewCompany ? newCompanyName : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "password") {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/30">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.6, 0.4, 0.6],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
          }}
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg"
            >
              {/* Header Card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                  style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)",
                    boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.4)",
                  }}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Shield className="w-10 h-10 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Create Admin Account
                </h1>
                <p className="text-muted-foreground">
                  Set up your initial administrator to get started with PeopleCore
                </p>
              </motion.div>

              {/* Form Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-premium rounded-3xl p-8"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span>Company</span>
                    </div>

                    {checkingCompanies ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Checking existing companies...</span>
                      </div>
                    ) : companies.length > 0 && !useNewCompany ? (
                      <div className="space-y-3">
                        <select
                          value={selectedCompanyId}
                          onChange={(e) => setSelectedCompanyId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setUseNewCompany(true)}
                          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Create a new company instead
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          placeholder="Enter company name"
                          required={useNewCompany}
                        />
                        {companies.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setUseNewCompany(false)}
                            className="text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            ← Use existing company
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>Admin Email</span>
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                    />
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <UserPlus className="w-4 h-4 text-primary" />
                        <span>First Name</span>
                      </label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Last Name
                      </label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>

                  {/* Info Box */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10"
                  >
                    <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Secure Password Generation</p>
                      <p>A secure temporary password will be automatically generated. You'll be able to copy it after the account is created.</p>
                    </div>
                  </motion.div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive"
                      >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(139, 92, 246) 100%)",
                      boxShadow: "0 8px 24px rgba(59, 130, 246, 0.35)",
                    }}
                    loading={loading}
                    loadingText="Creating admin account..."
                    disabled={loading}
                    icon={<Rocket className="w-5 h-5" />}
                  >
                    Create Admin Account
                  </Button>
                </form>
              </motion.div>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-muted-foreground mt-6"
              >
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign in instead
                </button>
              </motion.p>
            </motion.div>
          ) : (
            /* Success Result */
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg"
            >
              <motion.div
                className="glass-premium rounded-3xl p-8 text-center"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
                  style={{
                    background: result?.alreadyExists
                      ? "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)"
                      : "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {result?.alreadyExists ? (
                      <AlertCircle className="w-12 h-12 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    )}
                  </motion.div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-foreground mb-2"
                >
                  {result?.alreadyExists ? "Admin Already Exists" : "Admin Created Successfully!"}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground mb-8"
                >
                  {result?.alreadyExists
                    ? "An admin with this email already exists in the system."
                    : "Your administrator account has been created. Save these credentials!"}
                </motion.p>

                {/* Credentials Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4 mb-8"
                >
                  {/* Company */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="font-medium text-foreground">{result?.companyName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground">{result?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result?.email || "", "email")}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Copy email"
                    >
                      {copiedEmail ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Password (only show for new accounts) */}
                  {!result?.alreadyExists && result?.password && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">Temporary Password</p>
                          <p className="font-mono font-medium text-foreground">
                            {showPassword ? result.password : "••••••••••••••••"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(result?.password || "", "password")}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Copy password"
                        >
                          {copiedPassword ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Warning for new accounts */}
                {!result?.alreadyExists && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left mb-8"
                  >
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                        Save these credentials now!
                      </p>
                      <p className="text-amber-600/80 dark:text-amber-300/80">
                        This is the only time the password will be displayed. Make sure to save it securely and change it after your first login.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col gap-3"
                >
                  <Button
                    onClick={() => router.push("/login")}
                    className="w-full h-12 text-base font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(139, 92, 246) 100%)",
                      boxShadow: "0 8px 24px rgba(59, 130, 246, 0.35)",
                    }}
                    icon={<ArrowRight className="w-5 h-5" />}
                  >
                    Continue to Login
                  </Button>
                  <button
                    onClick={() => {
                      setStep("form");
                      setResult(null);
                      setError("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Create another admin
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

