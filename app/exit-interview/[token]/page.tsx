"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  LifeBuoy,
} from "lucide-react";

import { FullScreenHeader } from "@/components/ui/FullScreenHeader";

const SUPPORT_FALLBACK_EMAIL = "support@peoplecore.co.nz";

const ensureProtocol = (value?: string | null) => {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const normalisePhone = (value?: string | null) => {
  if (!value) return null;
  const cleaned = value.replace(/[^+\d]/g, "");
  return cleaned || null;
};

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  schemaJson: {
    fields: FormField[];
  };
}

interface Employee {
  firstName: string;
  lastName: string;
}

interface TenantContactDetails {
  companyName?: string | null;
  phone?: string | null;
  website?: string | null;
  supportEmail?: string | null;
}

export default function ExitInterviewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tenantContact, setTenantContact] = useState<TenantContactDetails | null>(
    null,
  );

  useEffect(() => {
    if (token) {
      loadForm();
    }
  }, [token]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start the form (this validates the token and gets form data)
      const response = await fetch("/api/exit-interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load form");
      }

      const data = await response.json();
      setTemplate(data.formTemplate);
      setEmployee(data.employee ?? data.Employee ?? null);
      setTenantContact(data.tenantContact ?? null);

      // Initialize form data
      const initialData: Record<string, any> = {};
      data.formTemplate.schemaJson.fields.forEach((field: FormField) => {
        if (field.type === "checkbox") {
          initialData[field.id] = [];
        } else {
          initialData[field.id] = "";
        }
      });
      setFormData(initialData);
    } catch (err) {
      console.error("Error loading form:", err);
      setError(err instanceof Error ? err.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCheckboxChange = (
    fieldId: string,
    option: string,
    checked: boolean,
  ) => {
    setFormData((prev) => {
      const currentValues = prev[fieldId] || [];
      if (checked) {
        return {
          ...prev,
          [fieldId]: [...currentValues, option],
        };
      } else {
        return {
          ...prev,
          [fieldId]: currentValues.filter((val: string) => val !== option),
        };
      }
    });
  };

  const validateForm = () => {
    if (!template) return false;

    for (const field of template.schemaJson.fields) {
      if (field.required) {
        const value = formData[field.id];
        if (field.type === "checkbox") {
          if (!Array.isArray(value) || value.length === 0) {
            return false;
          }
        } else {
          if (!value || value.trim() === "") {
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/exit-interview/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          answersJson: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit form");
      }

      setSubmitted(true);
      toast.success("Exit interview form submitted successfully");
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || "";

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            rows={4}
          />
        );

      case "select":
      case "dropdown":
        return (
          <Select
            value={value}
            onValueChange={(val) => handleInputChange(field.id, val)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  field.placeholder || `Select ${field.label.toLowerCase()}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(field.id, option, checked as boolean)
                  }
                />
                <Label htmlFor={`${field.id}-${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${option}`}
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <Label htmlFor={`${field.id}-${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  const companyName = tenantContact?.companyName?.trim() || null;
  const portalHref = useMemo(() => {
    return ensureProtocol(tenantContact?.website) ?? "/login";
  }, [tenantContact?.website]);

  const portalLabel = useMemo(() => {
    return companyName ? `Back to ${companyName} portal` : "Back to portal";
  }, [companyName]);

  const supportEmail = tenantContact?.supportEmail?.trim() || null;
  const phoneForDisplay = tenantContact?.phone?.trim() || null;
  const phoneForHref = useMemo(
    () => normalisePhone(tenantContact?.phone),
    [tenantContact?.phone],
  );

  const supportHref = useMemo(() => {
    if (supportEmail) return `mailto:${supportEmail}`;
    if (phoneForHref) return `tel:${phoneForHref}`;
    const portalUrl = ensureProtocol(tenantContact?.website);
    if (portalUrl) return portalUrl;
    return `mailto:${SUPPORT_FALLBACK_EMAIL}`;
  }, [supportEmail, phoneForHref, tenantContact?.website]);

  const supportLabel = useMemo(() => {
    if (supportEmail) return `Need help? Email ${supportEmail}`;
    if (phoneForDisplay) return `Need help? Call ${phoneForDisplay}`;
    if (tenantContact?.website && companyName)
      return `Need help? Visit ${companyName}`;
    if (tenantContact?.website) return "Need help? Visit your portal";
    return `Need help? Email ${SUPPORT_FALLBACK_EMAIL}`;
  }, [supportEmail, phoneForDisplay, tenantContact?.website, companyName]);

  const headerDescription = useMemo(() => {
    if (employee) {
      return `Exit interview for ${employee.firstName} ${employee.lastName}. Your responses will be shared securely with the HR team.`;
    }
    if (companyName) {
      return `Exit interview for ${companyName}. Share your honest feedback to help us improve the employee experience.`;
    }
    return "Share your honest feedback about your experience before you depart.";
  }, [employee, companyName]);

  const header = (
    <FullScreenHeader
      backSlot={
        <a
          href={portalHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
          aria-label={portalLabel}
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          <span>{portalLabel}</span>
        </a>
      }
      title={<span>Exit interview</span>}
      helpSlot={
        <a
          href={supportHref}
          className="inline-flex items-center gap-2"
          aria-label={supportLabel}
        >
          <LifeBuoy aria-hidden className="h-4 w-4" />
          <span>{supportLabel}</span>
        </a>
      }
    >
      <p className="text-sm text-muted-foreground">{headerDescription}</p>
    </FullScreenHeader>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading exit interview form...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Access error
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              If you believe this is incorrect, please reach out using the
              contact details above.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (submitted) {
      return (
        <Card className="w-full">
          <CardContent className="p-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Thank you
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Your exit interview form has been submitted successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              We appreciate your feedback and wish you all the best in your
              future endeavors.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!template || !employee) {
      return (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground">Form not found.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <CardTitle className="text-2xl">Exit Interview Form</CardTitle>
            </div>
            <p className="text-gray-600">
              Exit Interview for {employee.firstName} {employee.lastName}
            </p>
            {template.description && (
              <p className="text-sm text-gray-500 mt-2">
                {template.description}
              </p>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {template.schemaJson.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-sm font-medium">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  {renderField(field)}
                </div>
              ))}

              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={submitting || !validateForm()}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Exit Interview"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-10">
        {renderContent()}
      </div>
    </div>
  );
}
