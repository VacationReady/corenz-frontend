"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

type Contact = {
  id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function EmergencyContactsPage({
  params,
}: {
  params: { id: string };
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/employees/${params.id}/emergency-contacts`);
    if (!res.ok) return;
    const data: Contact[] = await res.json();
    setContacts(data);
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

  const save = async (contact: Contact) => {
    try {
      setLoading(true);
      if (contact.id.startsWith("__new__")) {
        const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            relationship: contact.relationship || undefined,
            phone: contact.phone || undefined,
            email: contact.email || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
      } else {
        const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contact),
        });
        if (!res.ok) throw new Error("Failed to update");
      }
      toast.success("Saved");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employees/${params.id}/emergency-contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Removed");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Emergency contacts</h1>

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
    </div>
  );
}


