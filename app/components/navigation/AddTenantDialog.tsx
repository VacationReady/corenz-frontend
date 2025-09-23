"use client";

import * as React from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TenantOption {
  id: string;
  name: string;
}

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantCreated?: (tenant: TenantOption) => void;
}

interface CreationResult {
  company: TenantOption;
  adminUser: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  activationToken: string;
}

const INITIAL_FORM = {
  companyName: "",
  adminEmail: "",
  adminName: "",
};

export function AddTenantDialog({
  open,
  onOpenChange,
  onTenantCreated,
}: AddTenantDialogProps) {
  const [formValues, setFormValues] = React.useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [creationResult, setCreationResult] = React.useState<CreationResult | null>(
    null,
  );

  const activationLink = React.useMemo(() => {
    if (!creationResult?.activationToken) return "";
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const path = `/activate?token=${creationResult.activationToken}`;
    return base ? `${base}${path}` : path;
  }, [creationResult]);

  const handleClose = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setFormValues(INITIAL_FORM);
        setIsSubmitting(false);
        setCreationResult(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormValues((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const isFormValid =
    formValues.companyName.trim().length > 0 &&
    formValues.adminEmail.trim().length > 0 &&
    formValues.adminName.trim().length > 0;

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isFormValid || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: formValues.companyName.trim(),
            adminEmail: formValues.adminEmail.trim(),
            adminName: formValues.adminName.trim(),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          const message = data?.error || "Failed to create tenant";
          toast.error(message);
          return;
        }

        const result: CreationResult = {
          company: {
            id: data.company.id,
            name: data.company.name,
          },
          adminUser: {
            email: data.adminUser.email,
            firstName: data.adminUser.firstName ?? null,
            lastName: data.adminUser.lastName ?? null,
          },
          activationToken: data.activationToken,
        };

        setCreationResult(result);
        onTenantCreated?.(result.company);
        toast.success(`Tenant “${result.company.name}” created`);
      } catch (error) {
        console.error("Failed to create tenant", error);
        toast.error("Unexpected error while creating tenant");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, isFormValid, isSubmitting, onTenantCreated],
  );

  const handleCopyActivationLink = React.useCallback(async () => {
    if (!activationLink) return;
    try {
      await navigator.clipboard.writeText(activationLink);
      toast.success("Activation link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy activation link", error);
      toast.error("Unable to copy link. Copy it manually instead.");
    }
  }, [activationLink]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        {creationResult ? (
          <div className="space-y-5">
            <DialogHeader className="space-y-1.5">
              <DialogTitle>Tenant created successfully</DialogTitle>
              <DialogDescription>
                Share the activation link with {creationResult.adminUser.email} so
                they can set their password and finish onboarding.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
              <p className="font-semibold text-primary">{creationResult.company.name}</p>
              <p className="text-muted-foreground">
                Admin: {creationResult.adminUser.email}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activation-link">Activation link</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="activation-link"
                  value={activationLink}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyActivationLink}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The link opens the password activation screen. It remains valid
                until the admin sets a password.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleClose(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogHeader className="space-y-1.5">
              <DialogTitle>Add tenant</DialogTitle>
              <DialogDescription>
                Create a new company space and invite its initial administrator.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Acme Corporation"
                  value={formValues.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminName">Admin full name</Label>
                <Input
                  id="adminName"
                  name="adminName"
                  placeholder="Alex Johnson"
                  value={formValues.adminName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin email</Label>
                <Input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={formValues.adminEmail}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isFormValid || isSubmitting}
              >
                Create tenant
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
