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
import { CalendarIcon, AlertCircle, User, Clock, Shield, Package, Users, FileText, CheckCircle } from "lucide-react";
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
    assetsToReturn: [],
    hrNotes: "",
  });

  useEffect(() => {
    if (open) {
      // Fetch employees for handover assignment
      fetchEmployees();
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
        ...formData,
        noticePeriodDays: formData.noticePeriodDays ? parseInt(formData.noticePeriodDays) : null,
        assetsToReturn: formData.assetsToReturn.length > 0 ? formData.assetsToReturn : null,
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