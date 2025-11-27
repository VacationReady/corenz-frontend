"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  FileText,
  Download,
  Upload,
  X,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Award,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Course {
  id: string;
  name: string;
}
interface Provider {
  id: string;
  name: string;
}
interface Document {
  id: string;
  name: string;
  url: string;
}

function getExpiryStatus(expiryDate: string | null): { 
  status: "valid" | "expiring" | "expired" | "permanent"; 
  label: string; 
  daysLeft?: number 
} {
  if (!expiryDate) {
    return { status: "permanent", label: "No Expiry" };
  }
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (isPast(expiry)) {
    return { status: "expired", label: "Expired", daysLeft: Math.abs(daysUntilExpiry) };
  }
  if (daysUntilExpiry <= 30) {
    return { status: "expiring", label: "Expiring Soon", daysLeft: daysUntilExpiry };
  }
  return { status: "valid", label: "Valid", daysLeft: daysUntilExpiry };
}

function getStatusStyles(status: "valid" | "expiring" | "expired" | "permanent") {
  switch (status) {
    case "valid":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      };
    case "expiring":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      };
    case "expired":
      return {
        badge: "bg-red-100 text-red-700 border-red-200",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
      };
    case "permanent":
      return {
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Award className="h-4 w-4 text-blue-500" />,
      };
  }
}

export default function EditTraining() {
  const router = useRouter();
  const params = useParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const trainingId = Array.isArray(params?.trainingId) ? params.trainingId[0] : (params?.trainingId ?? "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employeeName, setEmployeeName] = useState("Employee");
  
  // Form data
  const [courses, setCourses] = useState<Course[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [document, setDocument] = useState<Document | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, providersRes, recordRes, employeeRes] = await Promise.all([
          fetch("/api/courses/list"),
          fetch("/api/providers/list"),
          fetch(`/api/training-records/${trainingId}`),
          fetch(`/api/employees/${employeeId}`),
        ]);
        
        const [coursesData, providersData, recordData] = await Promise.all([
          coursesRes.json(),
          providersRes.json(),
          recordRes.json(),
        ]);

        setCourses(coursesData);
        setProviders(providersData);

        if (recordData.course?.id) {
          setSelectedCourse(recordData.course.id);
        }
        if (recordData.provider?.id) {
          setSelectedProvider(recordData.provider.id);
        }
        setDateCompleted(recordData.dateCompleted?.substring(0, 10) ?? "");
        setExpiryDate(recordData.expiryDate?.substring(0, 10) ?? "");
        setDocument(recordData.document);

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load training record");
      } finally {
        setLoading(false);
      }
    };

    if (trainingId) fetchData();
  }, [trainingId, employeeId]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append("courseId", selectedCourse);
    formData.append("providerId", selectedProvider);
    formData.append("dateCompleted", dateCompleted);
    formData.append("expiryDate", expiryDate);
    if (file) formData.append("file", file);

    try {
      const res = await fetch(`/api/training-records/${trainingId}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        toast.success("Training record updated successfully");
        router.push(`/employees/${employeeId}/training`);
      } else {
        const error = await res.json();
        toast.error("Error: " + error.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/training-records/${trainingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Training record deleted");
        router.push(`/employees/${employeeId}/training`);
      } else {
        const error = await res.json();
        toast.error("Error: " + error.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.name;
  const selectedProviderName = providers.find(p => p.id === selectedProvider)?.name;
  const { status, label, daysLeft } = getExpiryStatus(expiryDate || null);
  const statusStyles = getStatusStyles(status);

  if (loading) {
    return (
      <PageShell
        title="Edit Training Record"
        description="Update training details and certification"
        icon={<GraduationCap className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Training", href: `/employees/${employeeId}/training` },
            { label: "Edit", isCurrentPage: true },
          ],
        }}
      >
        <PageLoader text="Loading training record..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Edit Training Record"
      description="Update training details and certification"
      icon={<GraduationCap className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Training", href: `/employees/${employeeId}/training` },
          { label: "Edit", isCurrentPage: true },
        ],
      }}
      action={
        <Button
          variant="outline"
          onClick={() => router.push(`/employees/${employeeId}/training`)}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-premium rounded-2xl p-6 mb-6 shadow-premium"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10">
                <GraduationCap className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selectedCourseName || "Training Record"}</h2>
                <p className="text-sm text-muted-foreground">{selectedProviderName || "Unknown Provider"}</p>
              </div>
            </div>
            <Badge className={cn("border", statusStyles.badge)}>
              {statusStyles.icon}
              <span className="ml-1">{label}</span>
              {status !== "permanent" && status !== "expired" && daysLeft !== undefined && (
                <span className="ml-1">({daysLeft}d)</span>
              )}
            </Badge>
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-premium rounded-2xl p-8 shadow-premium"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Course
              </Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Provider
              </Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date Completed
                </Label>
                <Input
                  type="date"
                  value={dateCompleted}
                  onChange={(e) => setDateCompleted(e.target.value)}
                  className="h-12 rounded-xl glass-subtle border-white/20"
                  required
                />
              </div>
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
              </div>
            </div>

            {/* Current Document */}
            {document && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Certificate</Label>
                <div className="glass-subtle rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-100">
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium">{document.name}</p>
                        <p className="text-sm text-muted-foreground">Current document</p>
                      </div>
                    </div>
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {document ? "Replace Certificate (optional)" : "Upload Certificate (optional)"}
              </Label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
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
                      className="space-y-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                        <FileText className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-700">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="rounded-xl"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6 text-violet-600" />
                      </div>
                      <p className="font-medium">Drop file here or click to upload</p>
                      <p className="text-sm text-muted-foreground">PDF or image files up to 10MB</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/20">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Record
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Training Record?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the training record
                      and any associated certificate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex-1" />

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/employees/${employeeId}/training`)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-lg shadow-primary/25"
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </PageShell>
  );
}
