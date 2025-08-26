"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, User, Clock, Shield, Package, Users, FileText, CheckCircle, FormInput } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  jobRoleName?: string;
}

interface OffboardingModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
}

interface OffboardingFormData {
  lastWorkingDate: Date | null;
  offboardingType: string;
  offboardingReason: string;
  isVoluntary: boolean;
  noticePeriodDays: string;
  resignationDate: Date | null;
  removeAccessImmediately: boolean;
  handoverRequired: boolean;
  handoverAssignedTo: string;
  exitInterviewRequired: boolean;
  exitInterviewDate: Date | null;
  exitInterviewInterviewer: string;
  sendForm: boolean;
  formTemplateId: string;
  formTiming: 'NOW' | 'ON_DATE';
  assetsToReturn: string[];
  hrNotes: string;
}

const offboardingTypes = [
  { value: "RESIGNATION", label: "Resignation", icon: User },
  { value: "TERMINATION", label: "Termination", icon: AlertCircle },
  { value: "RETIREMENT", label: "Retirement", icon: Clock },
  { value: "END_OF_CONTRACT", label: "End of Contract", icon: FileText },
  { value: "REDUNDANCY", label: "Redundancy", icon: Users },
  { value: "OTHER", label: "Other", icon: FileText },
];

const commonAssets = [
  "Laptop/Computer",
  "Mobile Phone",
  "ID Card/Badge",
  "Keys",
  "Company Credit Card",
  "Uniform/Clothing",
  "Tools/Equipment",
  "Vehicle",
  "Documentation",
];

export default function OffboardingModal({ open, onClose, employee, onSuccess }: OffboardingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formData, setFormData] = useState<OffboardingFormData>({
    lastWorkingDate: null,
    offboardingType: "",
    offboardingReason: "",
    isVoluntary: true,
    noticePeriodDays: "",
    resignationDate: null,
    removeAccessImmediately: false,
    handoverRequired: false,
    handoverAssignedTo: "",
    exitInterviewRequired: false,
    exitInterviewDate: null,
    exitInterviewInterviewer: "",
    sendForm: false,
    formTemplateId: "",
    formTiming: 'NOW',
    assetsToReturn: [],
    hrNotes: "",
  });

  useEffect(() => {
    if (open) {
      // Fetch employees for handover assignment
      fetchEmployees();
      fetchFormTemplates();
      // Reset form when modal opens
      setFormData({
        lastWorkingDate: null,
        offboardingType: "",
        offboardingReason: "",
        isVoluntary: true,
        noticePeriodDays: "",
        resignationDate: null,
        removeAccessImmediately: false,
        handoverRequired: false,
        handoverAssignedTo: "",
        exitInterviewRequired: false,
        exitInterviewDate: null,
        exitInterviewInterviewer: "",
        sendForm: false,
        formTemplateId: "",
        formTiming: 'NOW',
        assetsToReturn: [],
        hrNotes: "",
      });
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees?status=active");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.filter((emp: Employee) => emp.id !== employee?.id));
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchFormTemplates = async () => {
    try {
      console.log('Fetching form templates...');
      const response = await fetch('/api/exit-interview-templates?activeOnly=true');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Form templates received:', data);
        setFormTemplates(data);
      } else {
        console.error('Failed to fetch form templates:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching form templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !formData.lastWorkingDate || !formData.offboardingType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        lastWorkingDate: formData.lastWorkingDate,
        offboardingType: formData.offboardingType,
        offboardingReason: formData.offboardingReason,
        isVoluntary: formData.isVoluntary,
        noticePeriodDays: formData.noticePeriodDays
          ? parseInt(formData.noticePeriodDays)
          : null,
        resignationDate: formData.resignationDate,
        removeAccessImmediately: formData.removeAccessImmediately,
        handoverRequired: formData.handoverRequired,
        handoverAssignedTo: formData.handoverAssignedTo,
        exitInterviewRequired: formData.exitInterviewRequired,
        assetsToReturn:
          formData.assetsToReturn.length > 0
            ? formData.assetsToReturn
            : null,
        hrNotes: formData.hrNotes,
      };

      const response = await fetch(`/api/employees/${employee.id}/offboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start offboarding");
      }

      const data = await response.json();

      if (formData.exitInterviewRequired && data.offboardingId) {
        await fetch(`/api/offboarding/${data.offboardingId}/exit-interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: formData.exitInterviewDate
              ? formData.exitInterviewDate.toISOString()
              : undefined,
            interviewerId: formData.exitInterviewInterviewer || undefined,
            sendForm: formData.sendForm,
            formTemplateId: formData.sendForm ? formData.formTemplateId : undefined,
            formTiming: formData.sendForm ? formData.formTiming : undefined,
          }),
        });
      }

      toast({
        title: "Offboarding Started",
        description: `Offboarding process has been initiated for ${employee.firstName} ${employee.lastName}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error starting offboarding:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start offboarding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssetToggle = (asset: string) => {
    setFormData(prev => ({
      ...prev,
      assetsToReturn: prev.assetsToReturn.includes(asset)
        ? prev.assetsToReturn.filter(a => a !== asset)
        : [...prev.assetsToReturn, asset]
    }));
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Start Offboarding Process
          </DialogTitle>
          <DialogDescription>
            Initiate the offboarding process for {employee.firstName} {employee.lastName} ({employee.email})
          </DialogDescription>
        </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Info Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Employee Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {employee.firstName} {employee.lastName}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {employee.email}
                </div>
                <div>
                  <span className="font-medium">Department:</span> {employee.departmentName || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Job Role:</span> {employee.jobRoleName || "N/A"}
                </div>
              </div>
            </div>

            {/* Key Dates */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Key Dates & Timeline
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lastWorkingDate">Last Working Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.lastWorkingDate ? (
                          format(formData.lastWorkingDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[200]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.lastWorkingDate || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, lastWorkingDate: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="resignationDate">Resignation Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.resignationDate ? (
                          format(formData.resignationDate, "PPP")
                        ) : (
                          <span>Pick a date (optional)</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[200]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.resignationDate || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, resignationDate: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="noticePeriodDays">Notice Period (days)</Label>
                  <Input
                    id="noticePeriodDays"
                    type="number"
                    value={formData.noticePeriodDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, noticePeriodDays: e.target.value }))}
                    placeholder="e.g., 14"
                  />
                </div>
              </div>
            </div>

            {/* Offboarding Type & Reason */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Offboarding Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="offboardingType">Offboarding Type *</Label>
                  <Select value={formData.offboardingType} onValueChange={(value) => setFormData(prev => ({ ...prev, offboardingType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {offboardingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isVoluntary"
                    checked={formData.isVoluntary}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVoluntary: checked as boolean }))}
                  />
                  <Label htmlFor="isVoluntary">Voluntary departure</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="offboardingReason">Reason for Leaving</Label>
                <Textarea
                  id="offboardingReason"
                  value={formData.offboardingReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, offboardingReason: e.target.value }))}
                  placeholder="Brief description of the reason for leaving..."
                  rows={3}
                />
              </div>
            </div>

            {/* Access Management */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Access Management
              </h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="removeAccessImmediately"
                  checked={formData.removeAccessImmediately}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, removeAccessImmediately: checked as boolean }))}
                />
                <Label htmlFor="removeAccessImmediately">Remove access immediately</Label>
              </div>
              
              {formData.removeAccessImmediately && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    System access will be revoked immediately upon starting the offboarding process.
                  </p>
                </div>
              )}
            </div>

            {/* Knowledge Transfer */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Knowledge Transfer
              </h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="handoverRequired"
                  checked={formData.handoverRequired}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, handoverRequired: checked as boolean }))}
                />
                <Label htmlFor="handoverRequired">Handover required</Label>
              </div>

              {formData.handoverRequired && (
                <div>
                  <Label htmlFor="handoverAssignedTo">Assign handover to</Label>
                  <Select value={formData.handoverAssignedTo} onValueChange={(value) => setFormData(prev => ({ ...prev, handoverAssignedTo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.departmentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Asset Return */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Assets to Return
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonAssets.map((asset) => (
                  <div key={asset} className="flex items-center space-x-2">
                    <Checkbox
                      id={asset}
                      checked={formData.assetsToReturn.includes(asset)}
                      onCheckedChange={() => handleAssetToggle(asset)}
                    />
                    <Label htmlFor={asset} className="text-sm">{asset}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Exit Interview */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Exit Process
              </h3>
              
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exitInterviewRequired"
                checked={formData.exitInterviewRequired}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, exitInterviewRequired: checked as boolean }))}
              />
              <Label htmlFor="exitInterviewRequired">Schedule exit interview</Label>
            </div>

            {formData.exitInterviewRequired && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exitInterviewDate">Interview date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={"w-full justify-start text-left font-normal"}
                        >
                          {formData.exitInterviewDate
                            ? format(formData.exitInterviewDate, "PPP")
                            : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.exitInterviewDate || undefined}
                          onSelect={(date) => setFormData(prev => ({ ...prev, exitInterviewDate: date || null }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="exitInterviewInterviewer">Interviewer</Label>
                    <Select
                      value={formData.exitInterviewInterviewer}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, exitInterviewInterviewer: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Exit Interview Form Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="sendForm"
                      checked={formData.sendForm}
                      onCheckedChange={(checked) => {
                        console.log('Checkbox changed:', checked);
                        setFormData(prev => ({ ...prev, sendForm: checked as boolean }));
                      }}
                    />
                    <Label htmlFor="sendForm">Send exit interview form?</Label>
                  </div>
                  
                  {/* Debug info */}
                  <div className="text-xs text-gray-500 mb-2">
                    Debug: sendForm = {formData.sendForm ? 'true' : 'false'}, templates = {formTemplates.length}
                  </div>

                  {formData.sendForm && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <Label htmlFor="formTemplate" className="text-sm font-medium">Exit Interview Form Template *</Label>
                        <div className="text-xs text-gray-500 mb-2">
                          Available templates: {formTemplates.length}
                          {formTemplates.length === 0 && (
                            <div className="mt-2">
                              <span className="text-red-500">⚠️ No templates available.</span>
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="outline" 
                                className="ml-2"
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/test/create-exit-template', { method: 'POST' });
                                    if (response.ok) {
                                      toast({
                                        title: "Success",
                                        description: "Test template created!",
                                      });
                                      fetchFormTemplates(); // Refresh the list
                                    } else {
                                      toast({
                                        title: "Error",
                                        description: "Failed to create test template",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Error creating test template",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Create Test Template
                              </Button>
                            </div>
                          )}
                        </div>
                        <Select 
                          value={formData.formTemplateId} 
                          onValueChange={(value) => {
                            console.log('Template selected:', value);
                            setFormData(prev => ({ ...prev, formTemplateId: value }));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select form template" />
                          </SelectTrigger>
                          <SelectContent>
                            {formTemplates.length === 0 ? (
                              <SelectItem value="" disabled>
                                No templates available
                              </SelectItem>
                            ) : (
                              formTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">When should the employee complete the form?</Label>
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="timing-now"
                              name="formTiming"
                              value="NOW"
                              checked={formData.formTiming === 'NOW'}
                              onChange={(e) => {
                                console.log('Timing changed to:', e.target.value);
                                setFormData(prev => ({ ...prev, formTiming: e.target.value as 'NOW' | 'ON_DATE' }));
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <Label htmlFor="timing-now" className="text-sm">Now (send immediately)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="timing-date"
                              name="formTiming"
                              value="ON_DATE"
                              checked={formData.formTiming === 'ON_DATE'}
                              onChange={(e) => {
                                console.log('Timing changed to:', e.target.value);
                                setFormData(prev => ({ ...prev, formTiming: e.target.value as 'NOW' | 'ON_DATE' }));
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <Label htmlFor="timing-date" className="text-sm">On the interview date</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

            {/* HR Notes */}
            <div>
              <Label htmlFor="hrNotes">HR Notes</Label>
              <Textarea
                id="hrNotes"
                value={formData.hrNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, hrNotes: e.target.value }))}
                placeholder="Internal notes for HR team..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Starting Offboarding..." : "Start Offboarding Process"}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}