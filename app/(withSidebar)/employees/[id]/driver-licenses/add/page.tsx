"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { PageShell } from "@/components/ui/PageShell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";
import {
  Car,
  CreditCard,
  Calendar,
  Upload,
  FileText,
  Check,
  ArrowLeft,
  ArrowRight,
  Shield,
  X,
  AlertCircle,
  Truck,
  Bike,
  Bus,
} from "lucide-react";

type Step = 1 | 2 | 3;

const steps = [
  { id: 1, name: "Licence Details", icon: CreditCard, description: "Enter licence information" },
  { id: 2, name: "Validity Dates", icon: Calendar, description: "Set issue and expiry dates" },
  { id: 3, name: "Documentation", icon: FileText, description: "Upload licence scan" },
];

// Common license types
const LICENSE_TYPES = [
  { value: "Full Car License", label: "Full Car License", emoji: "🚗" },
  { value: "Provisional License", label: "Provisional License", emoji: "🎓" },
  { value: "Motorcycle License", label: "Motorcycle License", emoji: "🏍️" },
  { value: "HGV Class 1", label: "HGV Class 1 (Articulated)", emoji: "🚛" },
  { value: "HGV Class 2", label: "HGV Class 2 (Rigid)", emoji: "🚚" },
  { value: "PSV License", label: "PSV (Bus/Coach)", emoji: "🚌" },
  { value: "Forklift License", label: "Forklift License", emoji: "🏗️" },
  { value: "ADR License", label: "ADR (Hazardous Goods)", emoji: "⚠️" },
  { value: "International Permit", label: "International Driving Permit", emoji: "🌍" },
];

export default function AddDriverLicence() {
  const router = useRouter();
  const params = useParams();
  const employeeIdRaw = params?.id ?? "";
  const employeeId = Array.isArray(employeeIdRaw) ? employeeIdRaw[0] : employeeIdRaw;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState("Employee");
  
  // Form data
  const [licenceType, setLicenceType] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Audit state
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/employees/${employeeId}`);
        if (res.ok) {
          const employee = await res.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
      }
    };
    fetchEmployee();
  }, [employeeId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!licenceType || !licenceNumber || !issueDate || !expiryDate) {
      toast.error("Please complete all required fields");
      return;
    }

    const formData = new FormData();
    formData.append("type", licenceType);
    formData.append("licenceNumber", licenceNumber);
    formData.append("issueDate", issueDate);
    formData.append("expiryDate", expiryDate);
    formData.append("employeeId", employeeId);
    if (file) formData.append("file", file);

    const changes: ChangeInfo[] = [
      { field: "type", oldValue: "", newValue: licenceType },
      { field: "licenceNumber", oldValue: "", newValue: licenceNumber },
      { field: "issueDate", oldValue: "", newValue: issueDate },
      { field: "expiryDate", oldValue: "", newValue: expiryDate },
    ];

    setPendingFormData(formData);
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  const handleReasonSubmit = async (reasons: Record<string, string>) => {
    if (!pendingFormData) return;
    try {
      setLoading(true);
      pendingFormData.append("reasons", JSON.stringify(reasons));
      
      const res = await fetch("/api/driver-licenses/create", {
        method: "POST",
        body: pendingFormData,
      });

      if (res.ok) {
        toast.success("Driver licence added successfully");
        router.push(`/employees/${employeeId}/driver-licenses`);
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error("Error: " + (error.error || "Failed to add licence"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add driver licence");
    } finally {
      setLoading(false);
      setIsReasonOpen(false);
      setPendingChanges([]);
      setPendingFormData(null);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return licenceType && licenceNumber;
      case 2:
        return issueDate && expiryDate;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    if (currentStep < 3 && canProceedToNextStep()) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  return (
    <PageShell
      title="Add Driver Licence"
      description="Record a new driving licence or certification"
      icon={<Car className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Driver Licences", href: `/employees/${employeeId}/driver-licenses` },
          { label: "Add Licence", isCurrentPage: true },
        ],
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-premium rounded-2xl p-6 mb-8 shadow-premium"
        >
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center relative">
                    <motion.div
                      animate={{
                        scale: isCurrent ? 1.1 : 1,
                        backgroundColor: isCompleted 
                          ? "rgb(16 185 129)" 
                          : isCurrent 
                            ? "rgb(6 182 212)" 
                            : "rgb(243 244 246)"
                      }}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                        isCurrent && "shadow-lg shadow-cyan-500/30"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <StepIcon className={cn(
                          "w-6 h-6",
                          isCurrent ? "text-white" : "text-gray-400"
                        )} />
                      )}
                    </motion.div>
                    <div className="mt-3 text-center">
                      <p className={cn(
                        "font-medium text-sm",
                        isCurrent ? "text-cyan-600" : isCompleted ? "text-emerald-600" : "text-gray-500"
                      )}>
                        {step.name}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-4 rounded-full bg-gray-200 relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: isCompleted ? "100%" : isCurrent ? "50%" : "0%" 
                        }}
                        className={cn(
                          "h-full rounded-full",
                          isCompleted ? "bg-emerald-500" : "bg-cyan-500"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-premium rounded-2xl p-8 shadow-premium"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10">
                  <CreditCard className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Licence Details</h2>
                  <p className="text-sm text-muted-foreground">Enter the licence type and number</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Licence Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Licence Type *</Label>
                  <Select value={licenceType} onValueChange={setLicenceType}>
                    <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20">
                      <SelectValue placeholder="Select licence type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.emoji}</span>
                            <span>{type.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Or enter a custom type below
                  </p>
                  <Input
                    value={licenceType}
                    onChange={(e) => setLicenceType(e.target.value)}
                    placeholder="e.g., Full NZ Car License"
                    className="h-11 rounded-xl glass-subtle border-white/20"
                  />
                </div>

                {/* Licence Number */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Licence Number *</Label>
                  <Input
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value)}
                    placeholder="e.g., MORGA753116SM9IJ"
                    className="h-12 rounded-xl glass-subtle border-white/20 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the unique identifier from the driving licence
                  </p>
                </div>

                {/* Preview */}
                {licenceType && licenceNumber && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100/50 border border-cyan-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500">
                        <Car className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-cyan-900">{licenceType}</p>
                        <p className="text-sm font-mono text-cyan-700">{licenceNumber}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-premium rounded-2xl p-8 shadow-premium"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Validity Dates</h2>
                  <p className="text-sm text-muted-foreground">Set the issue and expiry dates</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Issue Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Issue Date *</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-12 rounded-xl glass-subtle border-white/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    When was this licence issued?
                  </p>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expiry Date *</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-12 rounded-xl glass-subtle border-white/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    When does this licence expire?
                  </p>
                </div>

                {/* Expiry Warning */}
                {expiryDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">Expiry Tracking Enabled</p>
                        <p className="text-sm text-amber-700">
                          You'll receive automatic alerts when this licence is approaching expiry.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-premium rounded-2xl p-8 shadow-premium"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Documentation</h2>
                  <p className="text-sm text-muted-foreground">Upload a scan of the licence (optional)</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* File Upload */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                    dragActive
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-white/30 hover:border-cyan-400 hover:bg-white/30",
                    file && "border-emerald-500 bg-emerald-50"
                  )}
                >
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="application/pdf,image/*"
                  />
                  
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div
                        key="file"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="space-y-4"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                          <FileText className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-700">{file.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="rounded-xl"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove File
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto">
                          <Upload className="h-8 w-8 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Drop licence scan here or click to upload
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            PDF or image files up to 10MB
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-600" />
                    Licence Summary
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{licenceType || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number:</span>
                      <span className="font-medium font-mono">{licenceNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date:</span>
                      <span className="font-medium">{issueDate ? new Date(issueDate).toLocaleDateString() : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="font-medium">{expiryDate ? new Date(expiryDate).toLocaleDateString() : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Document:</span>
                      <span className="font-medium">{file ? "Attached" : "None"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={currentStep === 1 ? () => router.back() : goToPreviousStep}
            className="rounded-xl h-12 px-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={goToNextStep}
              disabled={!canProceedToNextStep()}
              className="rounded-xl h-12 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/25"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !licenceType || !licenceNumber || !issueDate || !expiryDate}
              className="rounded-xl h-12 px-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Creating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Add Driver Licence
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>

      {/* Change Reason Modal */}
      <ChangeReasonModal
        isOpen={isReasonOpen}
        onClose={() => {
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingFormData(null);
          setLoading(false);
        }}
        changes={pendingChanges}
        onSubmit={handleReasonSubmit}
      />
    </PageShell>
  );
}
