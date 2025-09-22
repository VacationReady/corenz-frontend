"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { LifeBuoy, Mail, Phone, Clock, ExternalLink } from "lucide-react";

import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "tenant-support-launcher:dismissed";

interface SupportEscalationHours {
  days: string;
  start: string;
  end: string;
  timezone: string;
  note?: string;
}

interface SupportContact {
  region: "NZ" | "AU";
  label: string;
  phone?: string;
  email?: string;
  escalationHours: SupportEscalationHours;
  escalationContact?: {
    label: string;
    value: string;
    href: string;
  };
}

interface SupportPayload {
  company: {
    id: string;
    name: string | null;
    region: string | null;
  };
  defaultRegion: "NZ" | "AU";
  contacts: SupportContact[];
  helpCenterUrl: string;
}

const formatPhoneHref = (value?: string) =>
  value ? `tel:${value.replace(/[^+\d]/g, "")}` : undefined;

export default function TenantSupportLauncher() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [support, setSupport] = useState<SupportPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined") return;

    try {
      const stored = window.sessionStorage.getItem(DISMISS_KEY);
      setDismissed(stored === "true");
    } catch (error) {
      console.warn("Unable to read support launcher dismissal state", error);
      setDismissed(false);
    }
    setHydrated(true);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let active = true;
    const loadSupport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/tenant/support", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const data = (await response.json()) as SupportPayload;
        if (!active) return;
        setSupport(data);
      } catch (error) {
        console.error("Unable to load support configuration", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadSupport();

    return () => {
      active = false;
    };
  }, [status]);

  const primaryContact = useMemo(() => {
    if (!support) return null;
    return support.contacts.find((contact) => contact.region === support.defaultRegion) ??
      support.contacts[0] ??
      null;
  }, [support]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(DISMISS_KEY, "true");
      } catch (error) {
        console.warn("Unable to persist support launcher dismissal", error);
      }
    }
    setDismissed(true);
    setOpen(false);
  };

  if (status !== "authenticated" || !hydrated) {
    return null;
  }

  if (dismissed || isLoading || !support || support.contacts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2 md:bottom-8 md:right-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-xl",
            "transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none",
            "motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5",
            !open && "motion-safe:animate-pulse",
          )}
          aria-label="Open support dialog"
        >
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold">Need support?</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="pointer-events-auto text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Dismiss for now
        </button>
      </div>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact PeopleCore support</DialogTitle>
          <DialogDescription>
            {support.company.name
              ? `We’re ready to help ${support.company.name}. Choose the best channel for your team.`
              : "We’re ready to help. Choose the best channel for your team."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {support.contacts.map((contact) => {
            const isPrimary = contact.region === support.defaultRegion;
            return (
              <section
                key={contact.region}
                className={cn(
                  "rounded-2xl border border-border/70 bg-muted/40 p-4",
                  isPrimary && "border-primary/60 bg-primary/5",
                )}
              >
                <header className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{contact.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPrimary ? "Primary tenant support" : "Regional support"}
                    </p>
                  </div>
                  {isPrimary && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Primary
                    </span>
                  )}
                </header>

                <div className="mt-4 grid gap-3 text-sm">
                  {contact.phone && (
                    <a
                      href={formatPhoneHref(contact.phone)}
                      className="inline-flex items-center gap-2 font-medium text-foreground hover:underline"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {contact.phone}
                    </a>
                  )}

                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {contact.email}
                    </a>
                  )}

                  <div className="rounded-xl bg-background/80 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      Escalation hours
                    </div>
                    <p className="mt-1">
                      {contact.escalationHours.days}, {contact.escalationHours.start} – {contact.escalationHours.end} {" "}
                      {contact.escalationHours.timezone}
                    </p>
                    {contact.escalationHours.note && (
                      <p className="mt-1">{contact.escalationHours.note}</p>
                    )}
                    {contact.escalationContact && (
                      <p className="mt-2">
                        Escalate via {contact.escalationContact.label}:{" "}
                        <a
                          href={contact.escalationContact.href}
                          className="font-medium text-primary hover:underline"
                        >
                          {contact.escalationContact.value}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </section>
            );
          })}

          {support.helpCenterUrl && (
            <a
              href={support.helpCenterUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Visit the help centre
            </a>
          )}

          <div className="flex flex-col gap-2 border-t border-border/70 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            {primaryContact && (
              <div className="text-xs text-muted-foreground">
                Default region: <span className="font-medium text-foreground">{primaryContact.label}</span>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dismiss this session
              </button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
