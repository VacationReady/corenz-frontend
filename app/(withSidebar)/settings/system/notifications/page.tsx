"use client";

import React, { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube,
  Mail,
  MessageSquare,
  Webhook,
  Settings,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  Calendar
} from "lucide-react";

interface NotificationChannel {
  id?: string;
  type: 'EMAIL' | 'SLACK' | 'TEAMS' | 'WEBHOOK';
  name: string;
  config: any;
  isActive: boolean;
  fallbackToEmail: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface NotificationSettings {
  id?: string;
  dailyDigestEnabled: boolean;
  weeklyDigestEnabled: boolean;
  digestRecipients: string[];
  emailTemplateEnabled: boolean;
  emailTemplateConfig?: any;
  defaultChannels: Record<string, string[]>;
}

const channelTypes = [
  {
    id: 'EMAIL',
    name: 'Email',
    description: 'Send notifications via email',
    icon: <Mail className="w-5 h-5" />,
    configFields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', required: true },
      { key: 'smtpPort', label: 'SMTP Port', type: 'number', required: true },
      { key: 'smtpUser', label: 'SMTP Username', type: 'text', required: true },
      { key: 'smtpPass', label: 'SMTP Password', type: 'password', required: true },
      { key: 'fromEmail', label: 'From Email', type: 'email', required: true },
      { key: 'fromName', label: 'From Name', type: 'text', required: false },
    ]
  },
  {
    id: 'SLACK',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    icon: <MessageSquare className="w-5 h-5" />,
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true },
      { key: 'channel', label: 'Default Channel', type: 'text', required: false },
      { key: 'username', label: 'Bot Username', type: 'text', required: false },
    ]
  },
  {
    id: 'TEAMS',
    name: 'Microsoft Teams',
    description: 'Send notifications to Teams channels',
    icon: <MessageSquare className="w-5 h-5" />,
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true },
      { key: 'title', label: 'Default Title', type: 'text', required: false },
    ]
  },
  {
    id: 'WEBHOOK',
    name: 'Custom Webhook',
    description: 'Send notifications to custom endpoints',
    icon: <Webhook className="w-5 h-5" />,
    configFields: [
      { key: 'url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'method', label: 'HTTP Method', type: 'select', required: true, options: ['POST', 'PUT', 'PATCH'] },
      { key: 'headers', label: 'Headers (JSON)', type: 'textarea', required: false },
      { key: 'secret', label: 'Secret Token', type: 'password', required: false },
    ]
  },
];

const notificationTypes = [
  { key: 'leave_request', label: 'Leave Requests' },
  { key: 'document_expiry', label: 'Document Expiry' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'automation', label: 'Automation Rules' },
  { key: 'system', label: 'System Alerts' },
];

export default function NotificationSettingsPage() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyDigestEnabled: false,
    weeklyDigestEnabled: false,
    digestRecipients: [],
    emailTemplateEnabled: false,
    defaultChannels: {},
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | null>(null);
  const [currentChannel, setCurrentChannel] = useState<NotificationChannel>({
    type: 'EMAIL',
    name: '',
    config: {},
    isActive: true,
    fallbackToEmail: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [channelsRes, settingsRes, usersRes] = await Promise.all([
        fetch('/api/notification-channels'),
        fetch('/api/notification-settings'),
        fetch('/api/users?limit=1000'),
      ]);

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannels(channelsData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveChannel = async () => {
    try {
      const method = selectedChannel?.id ? 'PUT' : 'POST';
      const url = selectedChannel?.id ? `/api/notification-channels/${selectedChannel.id}` : '/api/notification-channels';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentChannel)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Channel ${selectedChannel?.id ? 'updated' : 'created'} successfully`,
        });
        setChannelDialogOpen(false);
        resetChannelForm();
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save channel",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;

    try {
      const response = await fetch(`/api/notification-channels/${channelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Channel deleted successfully",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    }
  };

  const testChannel = async (channel: NotificationChannel) => {
    try {
      const response = await fetch(`/api/notification-channels/${channel.id}/test`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Test notification sent successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send test notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const resetChannelForm = () => {
    setCurrentChannel({
      type: 'EMAIL',
      name: '',
      config: {},
      isActive: true,
      fallbackToEmail: true,
    });
    setSelectedChannel(null);
  };

  const openCreateChannelDialog = () => {
    resetChannelForm();
    setChannelDialogOpen(true);
  };

  const openEditChannelDialog = (channel: NotificationChannel) => {
    setCurrentChannel(channel);
    setSelectedChannel(channel);
    setChannelDialogOpen(true);
  };

  const getChannelIcon = (type: string) => {
    const channelType = channelTypes.find(ct => ct.id === type);
    return channelType?.icon || <Bell className="w-5 h-5" />;
  };

  const getChannelTypeName = (type: string) => {
    const channelType = channelTypes.find(ct => ct.id === type);
    return channelType?.name || type;
  };

  const getStatusBadge = (channel: NotificationChannel) => {
    if (channel.isActive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <PageShell
      title="Notification Settings"
      description="Configure notification channels, digests, and email templates"
      breadcrumbs={breadcrumbConfigs.settingsSection("Notification Settings")}
    >
      <div className="space-y-6">
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="digests">Digests</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Notification Channels</h3>
                <p className="text-muted-foreground">
                  Configure different channels for sending notifications
                </p>
              </div>
              <Button onClick={openCreateChannelDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </div>

            {channels.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No channels configured</h4>
                    <p className="text-muted-foreground mb-4">
                      Add notification channels to send alerts via email, Slack, Teams, or webhooks
                    </p>
                    <Button onClick={openCreateChannelDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Channel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {channels.map((channel) => (
                  <Card key={channel.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getChannelIcon(channel.type)}
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {channel.name}
                              {getStatusBadge(channel)}
                            </CardTitle>
                            <CardDescription>
                              {getChannelTypeName(channel.type)} • 
                              {channel.fallbackToEmail && ' Fallback to email enabled'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testChannel(channel)}
                          >
                            <TestTube className="w-4 h-4 mr-2" />
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditChannelDialog(channel)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteChannel(channel.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {channel.type === 'SLACK' && channel.config.webhookUrl && (
                          <span>Webhook configured • Channel: {channel.config.channel || 'Default'}</span>
                        )}
                        {channel.type === 'TEAMS' && channel.config.webhookUrl && (
                          <span>Teams webhook configured</span>
                        )}
                        {channel.type === 'EMAIL' && channel.config.smtpHost && (
                          <span>SMTP: {channel.config.smtpHost}:{channel.config.smtpPort}</span>
                        )}
                        {channel.type === 'WEBHOOK' && channel.config.url && (
                          <span>Webhook: {channel.config.method} {channel.config.url}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Default Channel Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Default Channel Assignments</CardTitle>
                <CardDescription>
                  Configure which channels to use for different types of notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notificationTypes.map((type) => (
                    <div key={type.key} className="flex items-center justify-between">
                      <Label>{type.label}</Label>
                      <Select
                        value={settings.defaultChannels[type.key]?.[0] || ''}
                        onValueChange={(value) => setSettings({
                          ...settings,
                          defaultChannels: {
                            ...settings.defaultChannels,
                            [type.key]: value ? [value] : []
                          }
                        })}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Default (Email)</SelectItem>
                          {channels.filter(c => c.isActive).map((channel) => (
                            <SelectItem key={channel.id} value={channel.id!}>
                              {channel.name} ({getChannelTypeName(channel.type)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={saveSettings}>
                    Save Channel Assignments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Digest Settings
                </CardTitle>
                <CardDescription>
                  Configure daily and weekly digest notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.dailyDigestEnabled}
                    onChange={(checked) => setSettings({ ...settings, dailyDigestEnabled: checked })}
                  />
                  <Label>Enable daily digest</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.weeklyDigestEnabled}
                    onChange={(checked) => setSettings({ ...settings, weeklyDigestEnabled: checked })}
                  />
                  <Label>Enable weekly digest</Label>
                </div>

                <div>
                  <Label>Digest Recipients</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !settings.digestRecipients.includes(value)) {
                        setSettings({
                          ...settings,
                          digestRecipients: [...settings.digestRecipients, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => !settings.digestRecipients.includes(u.id)).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {settings.digestRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {settings.digestRecipients.map((recipientId) => {
                        const user = users.find(u => u.id === recipientId);
                        return (
                          <Badge key={recipientId} variant="secondary" className="flex items-center gap-1">
                            {user?.name || user?.email}
                            <button
                              onClick={() => setSettings({
                                ...settings,
                                digestRecipients: settings.digestRecipients.filter(id => id !== recipientId)
                              })}
                              className="ml-1 hover:text-red-600"
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveSettings}>
                    Save Digest Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Templates
                </CardTitle>
                <CardDescription>
                  Customize email notification templates and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.emailTemplateEnabled}
                    onChange={(checked) => setSettings({ ...settings, emailTemplateEnabled: checked })}
                  />
                  <Label>Enable custom email templates</Label>
                </div>

                {settings.emailTemplateEnabled && (
                  <div className="space-y-4">
                    <div>
                      <Label>Header HTML</Label>
                      <Textarea
                        value={settings.emailTemplateConfig?.header || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          emailTemplateConfig: {
                            ...settings.emailTemplateConfig,
                            header: e.target.value
                          }
                        })}
                        placeholder="Custom header HTML for email notifications"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label>Footer HTML</Label>
                      <Textarea
                        value={settings.emailTemplateConfig?.footer || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          emailTemplateConfig: {
                            ...settings.emailTemplateConfig,
                            footer: e.target.value
                          }
                        })}
                        placeholder="Custom footer HTML for email notifications"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={saveSettings}>
                    Save Template Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Channel Dialog */}
        <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedChannel ? 'Edit' : 'Create'} Notification Channel
              </DialogTitle>
              <DialogDescription>
                Configure a channel for sending notifications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Channel Name *</Label>
                  <Input
                    value={currentChannel.name}
                    onChange={(e) => setCurrentChannel({ ...currentChannel, name: e.target.value })}
                    placeholder="e.g., HR Slack Channel"
                  />
                </div>
                <div>
                  <Label>Channel Type *</Label>
                  <Select
                    value={currentChannel.type}
                    onValueChange={(value: any) => setCurrentChannel({ 
                      ...currentChannel, 
                      type: value,
                      config: {} // Reset config when type changes
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channelTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Channel Configuration */}
              <div className="space-y-4">
                <h4 className="font-medium">Channel Configuration</h4>
                {channelTypes.find(ct => ct.id === currentChannel.type)?.configFields.map((field) => (
                  <div key={field.key}>
                    <Label>{field.label}{field.required && ' *'}</Label>
                    {field.type === 'select' ? (
                      <Select
                        value={currentChannel.config[field.key] || ''}
                        onValueChange={(value) => setCurrentChannel({
                          ...currentChannel,
                          config: { ...currentChannel.config, [field.key]: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        value={currentChannel.config[field.key] || ''}
                        onChange={(e) => setCurrentChannel({
                          ...currentChannel,
                          config: { ...currentChannel.config, [field.key]: e.target.value }
                        })}
                        rows={3}
                      />
                    ) : (
                      <Input
                        type={field.type}
                        value={currentChannel.config[field.key] || ''}
                        onChange={(e) => setCurrentChannel({
                          ...currentChannel,
                          config: { ...currentChannel.config, [field.key]: e.target.value }
                        })}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentChannel.isActive}
                  onChange={(checked) => setCurrentChannel({ ...currentChannel, isActive: checked })}
                />
                <Label>Channel is active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentChannel.fallbackToEmail}
                  onChange={(checked) => setCurrentChannel({ ...currentChannel, fallbackToEmail: checked })}
                />
                <Label>Fallback to email if this channel fails</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setChannelDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveChannel}
                  disabled={!currentChannel.name || !currentChannel.type}
                >
                  {selectedChannel ? 'Update' : 'Create'} Channel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
