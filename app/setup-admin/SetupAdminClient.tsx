"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
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
  Rocket,
  RefreshCw,
  Check,
  X,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label: string;
  let color: string;

  if (score <= 2) {
    label = "Weak";
    color = "bg-red-500";
  } else if (score <= 3) {
    label = "Fair";
    color = "bg-amber-500";
  } else if (score <= 4) {
    label = "Good";
    color = "bg-blue-500";
  } else {
    label = "Strong";
    color = "bg-emerald-500";
  }

  return { score, label, color, checks };
}

export default function SetupAdminClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingCompanies, setCheckingCompanies] = useState(true);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [useNewCompany, setUseNewCompany] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = evaluatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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
          } else {
            // No companies exist, show create new company form
            setUseNewCompany(true);
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
    
    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create the admin account
      const response = await fetch("/api/setup-admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          password, // Will be hashed on the server
          companyId: useNewCompany ? null : selectedCompanyId,
          newCompanyName: useNewCompany ? newCompanyName : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      if (data.alreadyExists) {
        setError("An account with this email already exists. Please sign in instead.");
        setLoading(false);
        return;
      }

      // Step 2: Auto-login with the credentials
      setRegistrationComplete(true);
      
      const signInResult = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInResult?.ok) {
        // Step 3: Redirect to dashboard
        router.push("/dashboard/admin");
        router.refresh();
      } else {
        // Login failed but account was created - redirect to login
        router.push("/login?registered=true");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
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
          {registrationComplete ? (
            /* Loading/Redirect State */
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
                style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)",
                }}
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Account Created!</h2>
              <p className="text-muted-foreground mb-4">Signing you in and redirecting to your dashboard...</p>
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Please wait...</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg"
            >
              {/* Header */}
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
                  Create Your Account
                </h1>
                <p className="text-muted-foreground">
                  Set up your administrator account to get started with PeopleCore
                </p>
              </motion.div>

              {/* Form Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-premium rounded-3xl p-8"
              >
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Company Selection */}
                  <div className="space-y-3">
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
                      <div className="space-y-2">
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
                      <div className="space-y-2">
                        <Input
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          placeholder="Enter your company name"
                          required={useNewCompany || companies.length === 0}
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

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>Email Address</span>
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Lock className="w-4 h-4 text-primary" />
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${passwordStrength.color} rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength.score <= 2 ? "text-red-500" :
                            passwordStrength.score <= 3 ? "text-amber-500" :
                            passwordStrength.score <= 4 ? "text-blue-500" : "text-emerald-500"
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            8+ characters
                          </div>
                          <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            Uppercase letter
                          </div>
                          <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            Lowercase letter
                          </div>
                          <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {passwordStrength.checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            Number
                          </div>
                          <div className={`flex items-center gap-1 ${passwordStrength.checks.special ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {passwordStrength.checks.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            Special character
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        className={`pr-10 ${
                          confirmPassword && !passwordsMatch 
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/50" 
                            : confirmPassword && passwordsMatch 
                              ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/50"
                              : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Passwords do not match
                      </p>
                    )}
                    {confirmPassword && passwordsMatch && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Passwords match
                      </p>
                    )}
                  </div>

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
                    loadingText="Creating your account..."
                    disabled={loading || !passwordsMatch || passwordStrength.score < 3}
                    icon={<Rocket className="w-5 h-5" />}
                  >
                    Create Account & Sign In
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
