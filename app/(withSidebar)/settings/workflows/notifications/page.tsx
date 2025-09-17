"use client";

import { useState, useEffect, useMemo } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { Bell, UserCircle, Shield, Users, FileText, ClipboardList, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SectionPreference {
  section: string;
  label: string;
  description: string;
  route: string;
  notifyAdmin: boolean;
  notifyManager: boolean;
  notifyEmployee: boolean;
  updatedAt: Date | null;
  isDefault: boolean;
}

interface PreferenceGroup {
  id: string;
  label: string;
  sections: SectionPreference[];
}

export default function TransactionalNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<PreferenceGroup[]>([]);
  const [originalGroups, setOriginalGroups] = useState<PreferenceGroup[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Track which accordion items are open
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(groups) !== JSON.stringify(originalGroups);
    setIsDirty(hasChanges);
  }, [groups, originalGroups]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transactional-notifications");
      
      if (!response.ok) {
        throw new Error("Failed to fetch preferences");
      }
      
      const data = await response.json();
      setGroups(data.groups);
      setOriginalGroups(JSON.parse(JSON.stringify(data.groups)));
      
      // Open the first accordion by default
      if (data.groups.length > 0) {
        setOpenAccordions([data.groups[0].id]);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      // Flatten all sections for the API
      const sections = groups.flatMap(group => 
        group.sections.map(section => ({
          section: section.section,
          notifyAdmin: section.notifyAdmin,
          notifyManager: section.notifyManager,
          notifyEmployee: section.notifyEmployee,
        }))
      );
      
      const response = await fetch("/api/transactional-notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }
      
      const data = await response.json();
      setGroups(data.groups);
      setOriginalGroups(JSON.parse(JSON.stringify(data.groups)));
      toast.success("Notification preferences saved successfully");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (groupId: string, sectionId: string, field: 'notifyAdmin' | 'notifyManager' | 'notifyEmployee', value: boolean) => {
    setGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            sections: group.sections.map(section => {
              if (section.section === sectionId) {
                return {
                  ...section,
                  [field]: value,
                  isDefault: false,
                };
              }
              return section;
            }),
          };
        }
        return group;
      })
    );
  };

  const applyToAll = (field: 'notifyAdmin' | 'notifyManager' | 'notifyEmployee', value: boolean) => {
    setGroups(prevGroups => 
      prevGroups.map(group => ({
        ...group,
        sections: group.sections.map(section => ({
          ...section,
          [field]: value,
          isDefault: false,
        })),
      }))
    );
    toast.success(`${field === 'notifyAdmin' ? 'Admin' : field === 'notifyManager' ? 'Manager' : 'Employee'} notifications ${value ? 'enabled' : 'disabled'} for all sections`);
  };

  // Group icon mapping
  const getGroupIcon = (groupId: string) => {
    switch (groupId) {
      case 'Core Profile':
        return <UserCircle className="h-5 w-5" />;
      case 'Compliance':
        return <Shield className="h-5 w-5" />;
      case 'Forms':
        return <ClipboardList className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const breadcrumbs = {
    items: [
      { label: "Settings", href: "/settings" },
      { label: "Workflows", href: "/settings" },
      { label: "Transactional Notifications", href: "/settings/workflows/notifications" },
    ]
  };

  if (loading) {
    return (
      <PageShell
        title="Transactional Notifications"
        description="Configure who receives email notifications when employee records are updated"
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <div className="flex space-x-4">
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Transactional Notifications"
      description="Configure who receives email notifications when employee records are updated"
      breadcrumbs={breadcrumbs}
      action={
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyToAll('notifyAdmin', true)}
            >
              All Admin On
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyToAll('notifyManager', true)}
            >
              All Manager On
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyToAll('notifyEmployee', true)}
            >
              All Employee On
            </Button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => applyToAll('notifyAdmin', false)}
            >
              All Admin Off
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => applyToAll('notifyManager', false)}
            >
              All Manager Off
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => applyToAll('notifyEmployee', false)}
            >
              All Employee Off
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900">
                  Email notifications are sent automatically when employee records are updated. Configure who should receive these notifications for each section of the employee profile.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Admin:</strong> All company administrators • 
                  <strong> Manager:</strong> The employee's direct manager • 
                  <strong> Employee:</strong> The employee themselves
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preference Groups */}
        <Accordion 
          type="multiple" 
          value={openAccordions}
          onValueChange={setOpenAccordions}
          className="space-y-4"
        >
          {groups.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center space-x-3">
                  {getGroupIcon(group.id)}
                  <span className="font-medium text-lg">{group.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {group.sections.length} {group.sections.length === 1 ? 'section' : 'sections'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4 mt-4">
                  {group.sections.map((section) => (
                    <Card key={section.section} className="border-gray-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{section.label}</h4>
                              {section.isDefault && (
                                <Badge variant="outline" className="text-xs">Default</Badge>
                              )}
                              {!section.isDefault && (
                                <Badge variant="secondary" className="text-xs">Custom</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                            {section.route && (
                              <a 
                                href={`/employees/placeholder/${section.route}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center space-x-1"
                              >
                                <span>View section</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center space-x-6 ml-8">
                            <div className="flex flex-col items-center">
                              <label className="text-xs text-gray-500 mb-2">Admin</label>
                              <Switch
                                checked={section.notifyAdmin}
                                onChange={(value) => updateSection(group.id, section.section, 'notifyAdmin', value)}
                              />
                            </div>
                            <div className="flex flex-col items-center">
                              <label className="text-xs text-gray-500 mb-2">Manager</label>
                              <Switch
                                checked={section.notifyManager}
                                onChange={(value) => updateSection(group.id, section.section, 'notifyManager', value)}
                              />
                            </div>
                            <div className="flex flex-col items-center">
                              <label className="text-xs text-gray-500 mb-2">Employee</label>
                              <Switch
                                checked={section.notifyEmployee}
                                onChange={(value) => updateSection(group.id, section.section, 'notifyEmployee', value)}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Save Button */}
        {isDirty && (
          <div className="sticky bottom-4 flex justify-end">
            <Card className="shadow-lg">
              <CardContent className="py-3 px-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">You have unsaved changes</span>
                  <Button
                    onClick={() => {
                      setGroups(JSON.parse(JSON.stringify(originalGroups)));
                      toast.info("Changes discarded");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={savePreferences}
                    loading={saving}
                    disabled={saving}
                    size="sm"
                  >
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}
