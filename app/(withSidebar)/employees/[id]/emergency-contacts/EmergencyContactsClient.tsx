"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import ChangeReasonModal, { ChangeInfo, changeRequiresReason } from "@/components/audit/ChangeReasonModal";
import UnsavedChangesGuard, { useUnsavedChangesContext } from "@/components/ui/UnsavedChangesGuard";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";
import {
  Phone,
  User,
  Heart,
  Mail,
  Plus,
  Save,
  Trash2,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Contact = {
  id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
};

// Individual Contact Card Component
function ContactCard({
  contact,
  onUpdate,
  onSave,
  onRemove,
  isNew,
  loading,
}: {
  contact: Contact;
  onUpdate: (id: string, field: keyof Contact, value: string) => void;
  onSave: () => void;
  onRemove: () => void;
  isNew: boolean;
  loading: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl overflow-hidden shadow-depth-2 hover:shadow-depth-3 transition-all duration-300"
    >
      {/* Card Header */}
      <div className="relative px-5 py-4 border-b border-white/20 dark:border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20">
            <User className="w-5 h-5 text-primary dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {contact.name || "New Contact"}
            </h3>
            {contact.relationship && (
              <p className="text-sm text-muted-foreground truncate">{contact.relationship}</p>
            )}
          </div>
          {isNew && (
            <span className="px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              Unsaved
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Name
            </label>
            <Input
              value={contact.name || ""}
              onChange={(e) => onUpdate(contact.id, "name", e.target.value)}
              placeholder="Full name"
              className="h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
            />
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Heart className="w-4 h-4 text-muted-foreground" />
              Relationship
            </label>
            <Input
              value={contact.relationship || ""}
              onChange={(e) => onUpdate(contact.id, "relationship", e.target.value)}
              placeholder="e.g., Spouse, Parent, Sibling"
              className="h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Phone
            </label>
            <Input
              value={contact.phone || ""}
              onChange={(e) => onUpdate(contact.id, "phone", e.target.value)}
              placeholder="Phone number"
              type="tel"
              className="h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email
            </label>
            <Input
              type="email"
              value={contact.email || ""}
              onChange={(e) => onUpdate(contact.id, "email", e.target.value)}
              placeholder="email@example.com"
              className="h-11 rounded-xl bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button
            variant="secondary"
            onClick={onSave}
            disabled={loading || !contact.name}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
          {!isNew && (
            <Button
              variant="danger"
              onClick={onRemove}
              disabled={loading}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Empty State Component
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-3xl p-12 text-center"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 mb-4">
        <AlertCircle className="w-8 h-8 text-primary dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No Emergency Contacts
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto mb-6">
        Emergency contacts are important for workplace safety. Add at least one contact who can be reached in case of an emergency.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <UserPlus className="w-4 h-4" />
        Add Emergency Contact
      </Button>
    </motion.div>
  );
}

export default function EmergencyContactsClient({ employeeId }: { employeeId: string }) {
  const unsavedCtxRef = useRef<{ markSaved: () => void } | null>(null);

  function UnsavedContextBridge() {
    const ctx = useUnsavedChangesContext();
    useEffect(() => {
      if (ctx) {
        unsavedCtxRef.current = { markSaved: ctx.markSaved };
      } else {
        unsavedCtxRef.current = null;
      }
    }, [ctx]);
    return null;
  }

  const tenantFetch = useTenantFetch();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [originalContacts, setOriginalContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingAction, setPendingAction] = useState<"create" | "update" | "delete" | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const load = async () => {
    const res = await tenantFetch(`/api/employees/${employeeId}/emergency-contacts`);
    if (!res.ok) return;
    const data: Contact[] = await res.json();
    setContacts(data);
    setOriginalContacts(data);
    unsavedCtxRef.current?.markSaved();
  };

  useEffect(() => {
    load();
  }, [employeeId, tenantFetch]);

  const addEmpty = () => {
    setContacts((c) => [
      ...c,
      { id: "__new__" + Math.random().toString(36).slice(2), name: "", relationship: "", phone: "", email: "" },
    ]);
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts((all) =>
      all.map((x) => (x.id === id ? { ...x, [field]: value } : x))
    );
  };

  const openReasonForCreate = (contact: Contact) => {
    const summary = {
      name: contact.name,
      relationship: contact.relationship || undefined,
      phone: contact.phone || undefined,
      email: contact.email || undefined,
    };
    const changes: ChangeInfo[] = [
      { field: "__create__", oldValue: "", newValue: JSON.stringify(summary) },
    ];
    setPendingAction("create");
    setPendingPayload(summary);
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  const openReasonForUpdate = async (contact: Contact) => {
    const original = originalContacts.find((c) => c.id === contact.id);
    if (!original) {
      toast.error("Original contact not found");
      return;
    }
    const allowed: Array<keyof Contact> = ["name", "relationship", "phone", "email"];
    const changes: ChangeInfo[] = [];
    for (const key of allowed) {
      const oldValue = (original as any)[key] ?? "";
      const newValue = (contact as any)[key] ?? "";
      if (String(oldValue) !== String(newValue)) {
        changes.push({ field: key as string, oldValue: String(oldValue), newValue: String(newValue) });
      }
    }
    if (changes.length === 0) {
      toast.success("No changes to save");
      unsavedCtxRef.current?.markSaved();
      return;
    }
    if (!changes.some(changeRequiresReason)) {
      const res = await tenantFetch(`/api/employees/${employeeId}/emergency-contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contact, reasons: {} }),
      });
      if (!res.ok) {
        throw new Error("Failed to update");
      }
      setShowSuccess(true);
      await load();
      return;
    }
    setPendingAction("update");
    setPendingPayload(contact);
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  const openReasonForDelete = (contact: Contact) => {
    const changes: ChangeInfo[] = [
      { field: "__delete__", oldValue: JSON.stringify({ name: contact.name, relationship: contact.relationship, phone: contact.phone, email: contact.email }), newValue: "true" },
    ];
    setPendingAction("delete");
    setPendingPayload({ id: contact.id });
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  const save = async (contact: Contact) => {
    try {
      setLoading(true);
      if (contact.id.startsWith("__new__")) {
        openReasonForCreate(contact);
      } else {
        await openReasonForUpdate(contact);
      }
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setLoading(true);
      const contact = contacts.find((c) => c.id === id);
      if (!contact) throw new Error("Contact not found");
      openReasonForDelete(contact);
    } catch (e: any) {
      toast.error(e?.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UnsavedChangesGuard>
      <UnsavedContextBridge />
      <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
        <HeaderWithHistory
          title="Emergency contacts"
          employeeId={employeeId}
          section="emergency-contacts"
          description="Contacts to notify in case of emergency"
        />

        {/* Add Contact Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-end"
        >
          <Button onClick={addEmpty} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Add contact
          </Button>
        </motion.div>

        {/* Contact Cards */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {contacts.length === 0 ? (
              <EmptyState onAdd={addEmpty} />
            ) : (
              contacts.map((contact, index) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onUpdate={updateContact}
                  onSave={() => save(contact)}
                  onRemove={() => remove(contact.id)}
                  isNew={contact.id.startsWith("__new__")}
                  loading={loading}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        <ChangeReasonModal
          isOpen={isReasonOpen}
          onClose={() => {
            setIsReasonOpen(false);
            setPendingChanges([]);
            setPendingAction(null);
            setPendingPayload(null);
          }}
          changes={pendingChanges}
          onSubmit={async (reasons) => {
            try {
              setLoading(true);
              if (pendingAction === "create") {
                const res = await tenantFetch(`/api/employees/${employeeId}/emergency-contacts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...pendingPayload, reason: reasons["__create__"] }),
                });
                if (!res.ok) throw new Error("Failed to create");
              } else if (pendingAction === "update") {
                const res = await tenantFetch(`/api/employees/${employeeId}/emergency-contacts`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...pendingPayload, reasons }),
                });
                if (!res.ok) throw new Error("Failed to update");
              } else if (pendingAction === "delete") {
                const res = await tenantFetch(`/api/employees/${employeeId}/emergency-contacts`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: pendingPayload.id, reason: reasons["__delete__"] }),
                });
                if (!res.ok) throw new Error("Failed to delete");
              }
              setShowSuccess(true);
              setIsReasonOpen(false);
              setPendingChanges([]);
              setPendingAction(null);
              setPendingPayload(null);
              await load();
            } catch (e: any) {
              toast.error(e?.message || "Action failed");
            } finally {
              setLoading(false);
            }
          }}
        />

        <ProfileUpdateSuccessAnimation
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          fieldName="Emergency Contacts"
        />
      </div>
    </UnsavedChangesGuard>
  );
}
