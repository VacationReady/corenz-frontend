"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import ChangeReasonModal, { ChangeInfo, changeRequiresReason } from "@/components/audit/ChangeReasonModal";

type Contact = {
  id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function EmergencyContactsPage() {
  const { id } = useParams() as { id: string };
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [originalContacts, setOriginalContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingAction, setPendingAction] = useState<"create" | "update" | "delete" | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const load = async () => {
    const res = await fetch(`/api/employees/${id}/emergency-contacts`);
    if (!res.ok) return;
    const data: Contact[] = await res.json();
    setContacts(data);
    setOriginalContacts(data);
  };

  useEffect(() => {
    load();
  }, []);

  const addEmpty = () => {
    setContacts((c) => [
      ...c,
      { id: "__new__" + Math.random().toString(36).slice(2), name: "", relationship: "", phone: "", email: "" },
    ]);
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
      return;
    }
    if (!changes.some(changeRequiresReason)) {
      const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contact, reasons: {} }),
      });
      if (!res.ok) {
        throw new Error("Failed to update");
      }
      toast.success("Saved");
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
    <div className="max-w-3xl mx-auto space-y-6">
      <HeaderWithHistory title="Emergency contacts" employeeId={id} section="emergency-contacts" />

      <div className="flex justify-end">
        <Button onClick={addEmpty}>Add contact</Button>
      </div>

      <div className="space-y-4">
        {contacts.map((c) => (
          <Card key={c.id}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={c.name || ""}
                  onChange={(e) =>
                    setContacts((all) =>
                      all.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Relationship</label>
                <Input
                  value={c.relationship || ""}
                  onChange={(e) =>
                    setContacts((all) =>
                      all.map((x) =>
                        x.id === c.id ? { ...x, relationship: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={c.phone || ""}
                  onChange={(e) =>
                    setContacts((all) =>
                      all.map((x) => (x.id === c.id ? { ...x, phone: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={c.email || ""}
                  onChange={(e) =>
                    setContacts((all) =>
                      all.map((x) => (x.id === c.id ? { ...x, email: e.target.value } : x)),
                    )
                  }
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => save(c)} disabled={loading}>
                  Save
                </Button>
                {(!c.id.startsWith("__new__")) && (
                  <Button variant="danger" onClick={() => remove(c.id)} disabled={loading}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
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
              const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...pendingPayload, reason: reasons["__create__"] }),
              });
              if (!res.ok) throw new Error("Failed to create");
            } else if (pendingAction === "update") {
              const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...pendingPayload, reasons }),
              });
              if (!res.ok) throw new Error("Failed to update");
            } else if (pendingAction === "delete") {
              const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: pendingPayload.id, reason: reasons["__delete__"] }),
              });
              if (!res.ok) throw new Error("Failed to delete");
            }
            toast.success("Saved");
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
    </div>
  );
}


