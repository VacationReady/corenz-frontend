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
import { CalendarIcon, AlertCircle, User, Clock, Shield, Package, Users, FileText, CheckCircle, Mail, FormInput } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  jobRoleName?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
}

interface OffboardingModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

interface OffboardingFormData {
  // Exit Interview Details
  exitInterviewDate: Date | undefined;
  exitInterviewTime: string;
  interviewerUserId: string;
  interviewerName: string;
  interviewerEmail: string;
  location: string;
  notes: string;
  
  // Form Configuration
  sendForm: boolean;
  formTemplateId: string;
  formTiming: 'NOW' | 'ON_DATE';
}

const offboardingTypes = [
  { value: "RESIGNATION", label: "Resignation", icon: User },
  { value: "TERMINATION", label: "Termination", icon: AlertCircle },
  { value: "RETIREMENT", label: "Retirement", icon: Clock },
  { value: "END_OF_CONTRACT", label: "End of Contract", icon: FileText },
  { value: "REDUNDANCY", label: "Redundancy", icon: Users },
  { value: "OTHER", label: "Other", icon: FileText },
];

export default function EnhancedOffboardingModal({ open, onClose, employee, onSuccess }: OffboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formData, setFormData] = useState<OffboardingFormData>({
    exitInterviewDate: undefined,
    exitInterviewTime: "09:00",
    interviewerUserId: "",
    interviewerName: "",
    interviewerEmail: "",
    location: "",
    notes: "",
    sendForm: false,
    formTemplateId: "",
    formTiming: 'NOW'
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchFormTemplates();
      resetForm();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((user: User) => user.id !== employee?.id)); // Exclude the employee being offboarded
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchFormTemplates = async () => {
    try {
      const response = await fetch('/api/exit-interview-templates?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setFormTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching form templates:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      exitInterviewDate: undefined,
      exitInterviewTime: "09:00",
      interviewerUserId: "",
      interviewerName: "",
      interviewerEmail: "",
      location: "",
      notes: "",
      sendForm: false,
      formTemplateId: "",
      formTiming: 'NOW'
    });
  };

  const handleInterviewerChange = (userId: string) => {
    if (userId === 'other') {
      setFormData(prev => ({
        ...prev,
        interviewerUserId: "",
        interviewerName: "",
        interviewerEmail: ""
      }));
    } else {
      const selectedUser = users.find(user => user.id === userId);
      if (selectedUser) {
        setFormData(prev => ({
          ...prev,
          interviewerUserId: userId,
          interviewerName: `${selectedUser.firstName} ${selectedUser.lastName}`,
          interviewerEmail: selectedUser.email
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) return;

    // Validation
    if (!formData.exitInterviewDate) {
      toast.error('Please select an exit interview date');
      return;
    }

    if (!formData.interviewerUserId && (!formData.interviewerName || !formData.interviewerEmail)) {
      toast.error('Please select an interviewer or provide interviewer details');
      return;
    }

    if (formData.sendForm && !formData.formTemplateId) {
      toast.error('Please select a form template');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/offboarding/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          exitInterviewDate: formData.exitInterviewDate ? format(formData.exitInterviewDate, 'yyyy-MM-dd') : null,
          exitInterviewTime: formData.exitInterviewTime,
          interviewerUserId: formData.interviewerUserId || null,
          interviewerName: formData.interviewerName || null,
          interviewerEmail: formData.interviewerEmail || null,
          location: formData.location,
          notes: formData.notes,
          sendForm: formData.sendForm,
          formTemplateId: formData.sendForm ? formData.formTemplateId : null,
          formTiming: formData.sendForm ? formData.formTiming : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate offboarding');
      }

      const result = await response.json();
      
      toast.success('Offboarding initiated successfully');
      
      if (result.offboarding.emailSent) {
        toast.success('Exit interview confirmation email sent');
      }
      
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error initiating offboarding:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate offboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Initiate Offboarding
          </DialogTitle>
          <DialogDescription>
            Set up exit interview and offboarding process for {employee?.firstName} {employee?.lastName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exit Interview Section */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Exit Interview Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exitInterviewDate">Interview Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.exitInterviewDate ? (
                        format(formData.exitInterviewDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.exitInterviewDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, exitInterviewDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="exitInterviewTime">Interview Time</Label>
                <Input
                  type="time"
                  value={formData.exitInterviewTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, exitInterviewTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="interviewer">Interviewer</Label>
              <Select value={formData.interviewerUserId || 'other'} onValueChange={handleInterviewerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} - {user.email}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other (external)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(!formData.interviewerUserId || formData.interviewerUserId === 'other') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interviewerName">Interviewer Name</Label>
                  <Input
                    value={formData.interviewerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerName: e.target.value }))}
                    placeholder="Enter interviewer name"
                  />
                </div>
                <div>
                  <Label htmlFor="interviewerEmail">Interviewer Email</Label>
                  <Input
                    type="email"
                    value={formData.interviewerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, interviewerEmail: e.target.value }))}
                    placeholder="Enter interviewer email"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Meeting room, online, etc."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for the exit interview"
                rows={3}
              />
            </div>
          </div>

          {/* Exit Interview Form Section */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <FormInput className="w-4 h-4" />
              Exit Interview Form
            </h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendForm"
                checked={formData.sendForm}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendForm: checked as boolean }))}
              />
              <Label htmlFor="sendForm">Send exit interview form?</Label>
            </div>

            {formData.sendForm && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                <div>
                  <Label htmlFor="formTemplate">Exit Interview Form Template</Label>
                  <Select 
                    value={formData.formTemplateId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, formTemplateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form template" />
                    </SelectTrigger>
                    <SelectContent>
                      {formTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>When should the employee complete the form?</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="timing-now"
                        name="formTiming"
                        value="NOW"
                        checked={formData.formTiming === 'NOW'}
                        onChange={(e) => setFormData(prev => ({ ...prev, formTiming: e.target.value as 'NOW' | 'ON_DATE' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <Label htmlFor="timing-now">Now (send immediately)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="timing-date"
                        name="formTiming"
                        value="ON_DATE"
                        checked={formData.formTiming === 'ON_DATE'}
                        onChange={(e) => setFormData(prev => ({ ...prev, formTiming: e.target.value as 'NOW' | 'ON_DATE' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <Label htmlFor="timing-date">On the interview date</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Initiate Offboarding
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
