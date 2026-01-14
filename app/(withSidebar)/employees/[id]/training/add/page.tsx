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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageShell } from "@/components/ui/PageShell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  BookOpen,
  Building2,
  Calendar,
  Upload,
  FileText,
  Check,
  Plus,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  X,
  Award,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Course {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
}

type Step = 1 | 2 | 3;

const steps = [
  { id: 1, name: "Course Details", icon: BookOpen, description: "Select training course" },
  { id: 2, name: "Dates", icon: Calendar, description: "Set completion dates" },
  { id: 3, name: "Certificate", icon: Award, description: "Upload documentation" },
];

export default function AddTraining() {
  const router = useRouter();
  const params = useParams();
  const employeeIdRaw = params?.id ?? "";
  const employeeId = Array.isArray(employeeIdRaw) ? employeeIdRaw[0] : employeeIdRaw;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState("Employee");
  
  // Form data
  const [courses, setCourses] = useState<Course[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Modals for adding new course/provider
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newProviderName, setNewProviderName] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [creatingProvider, setCreatingProvider] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, providersRes, employeeRes] = await Promise.all([
          fetch("/api/courses/list"),
          fetch("/api/providers/list"),
          fetch(`/api/employees/${employeeId}`),
        ]);
        
        const coursesData = await coursesRes.json();
        const providersData = await providersRes.json();
        setCourses(coursesData);
        setProviders(providersData);

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      }
    };
    fetchData();
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
    if (!selectedCourse || !selectedProvider || !dateCompleted) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("employeeId", employeeId);
    formData.append("courseId", selectedCourse);
    formData.append("providerId", selectedProvider);
    formData.append("dateCompleted", dateCompleted);
    if (expiryDate) formData.append("expiryDate", expiryDate);
    if (file) formData.append("file", file);
    
    // Include reasons for audit trail
    const reasons: Record<string, string> = {
      courseId: "Training course completed",
      providerId: "Training provider",
      dateCompleted: "Date of completion",
    };
    if (expiryDate) reasons.expiryDate = "Certificate expiry date";
    if (file) reasons.documentId = "Certificate uploaded";
    formData.append("reasons", JSON.stringify(reasons));

    try {
      const res = await fetch("/api/training-records/create", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Training record added successfully");
        router.push(`/employees/${employeeId}/training`);
      } else {
        const error = await res.json();
        toast.error("Error: " + error.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add training record");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim()) return;
    setCreatingCourse(true);
    try {
      const res = await fetch("/api/courses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCourseName }),
      });
      const data = await res.json();
      setCourses((prev) => [...prev, data]);
      setSelectedCourse(data.id);
      setNewCourseName("");
      setIsCourseModalOpen(false);
      toast.success("Course added successfully");
    } catch (error) {
      toast.error("Failed to create course");
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleAddProvider = async () => {
    if (!newProviderName.trim()) return;
    setCreatingProvider(true);
    try {
      const res = await fetch("/api/providers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProviderName }),
      });
      const data = await res.json();
      setProviders((prev) => [...prev, data]);
      setSelectedProvider(data.id);
      setNewProviderName("");
      setIsProviderModalOpen(false);
      toast.success("Provider added successfully");
    } catch (error) {
      toast.error("Failed to create provider");
    } finally {
      setCreatingProvider(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedCourse && selectedProvider;
      case 2:
        return dateCompleted;
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

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.name;
  const selectedProviderName = providers.find(p => p.id === selectedProvider)?.name;

  return (
    <PageShell
      title="Add Training Record"
      description="Record a new training completion or certification"
      icon={<GraduationCap className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Training", href: `/employees/${employeeId}/training` },
          { label: "Add Training", isCurrentPage: true },
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
                            ? "rgb(99 102 241)" 
                            : "rgb(243 244 246)"
                      }}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                        isCurrent && "shadow-lg shadow-indigo-500/30"
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
                        isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-gray-500"
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
                          isCompleted ? "bg-emerald-500" : "bg-indigo-500"
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
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/10">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Course Details</h2>
                  <p className="text-sm text-muted-foreground">Select the training course and provider</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Course Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Training Course *</Label>
                  <div className="flex gap-2">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20 flex-1">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            <span className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              {course.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCourseModalOpen(true)}
                      className="h-12 px-4 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Can't find your course? Click + to add a new one.
                  </p>
                </div>

                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Training Provider *</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20 flex-1">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {provider.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsProviderModalOpen(true)}
                      className="h-12 px-4 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Who delivered or certified this training?
                  </p>
                </div>

                {/* Preview */}
                {selectedCourse && selectedProvider && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-indigo-900">{selectedCourseName}</p>
                        <p className="text-sm text-indigo-700">by {selectedProviderName}</p>
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
                  <h2 className="text-xl font-semibold">Training Dates</h2>
                  <p className="text-sm text-muted-foreground">When was this training completed?</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Date Completed */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date Completed *</Label>
                  <Input
                    type="date"
                    value={dateCompleted}
                    onChange={(e) => setDateCompleted(e.target.value)}
                    className="h-12 rounded-xl glass-subtle border-white/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    When did the employee complete this training?
                  </p>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Expiry Date (optional)
                  </Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-12 rounded-xl glass-subtle border-white/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if this certification doesn't expire.
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
                          You'll receive automatic alerts when this certification is approaching expiry.
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
                  <Award className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Certificate Upload</h2>
                  <p className="text-sm text-muted-foreground">Upload the training certificate (optional)</p>
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
                      ? "border-violet-500 bg-violet-50"
                      : "border-white/30 hover:border-violet-400 hover:bg-white/30",
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
                        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
                          <Upload className="h-8 w-8 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Drop certificate here or click to upload
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
                    <Sparkles className="h-4 w-4 text-primary" />
                    Training Summary
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Course:</span>
                      <span className="font-medium">{selectedCourseName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="font-medium">{selectedProviderName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">{dateCompleted ? new Date(dateCompleted).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">{expiryDate ? new Date(expiryDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "Never"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificate:</span>
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
              className="rounded-xl h-12 px-6 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-lg shadow-primary/25"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedCourse || !selectedProvider || !dateCompleted}
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
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add Training Record
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>

      {/* Add Course Modal */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Add New Course
            </DialogTitle>
            <DialogDescription>
              Create a new training course that will be available for all employees.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium">Course Name</Label>
            <Input
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="e.g., First Aid Training"
              className="mt-2 h-11 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleAddCourse()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCourse} disabled={creatingCourse || !newCourseName.trim()}>
              {creatingCourse ? "Creating..." : "Add Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Provider Modal */}
      <Dialog open={isProviderModalOpen} onOpenChange={setIsProviderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Add New Provider
            </DialogTitle>
            <DialogDescription>
              Create a new training provider that will be available for all records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium">Provider Name</Label>
            <Input
              value={newProviderName}
              onChange={(e) => setNewProviderName(e.target.value)}
              placeholder="e.g., St John Ambulance"
              className="mt-2 h-11 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleAddProvider()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProviderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProvider} disabled={creatingProvider || !newProviderName.trim()}>
              {creatingProvider ? "Creating..." : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
