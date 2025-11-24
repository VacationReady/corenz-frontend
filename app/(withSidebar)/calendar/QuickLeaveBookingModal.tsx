"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { Calendar, UserPlus } from "lucide-react";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { Avatar } from "@/components/ui/Avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Employee {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    profileImageUrl: string | null;
  };
  department?: {
    name: string;
  } | null;
}

interface EventCategory {
  id: string;
  name: string;
  iconKey?: string | null;
}

interface QuickLeaveBookingModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultStartDate: Date | null;
  defaultEndDate: Date | null;
  onSubmitted: () => void;
}

export default function QuickLeaveBookingModal({
  open,
  setOpen,
  defaultStartDate,
  defaultEndDate,
  onSubmitted,
}: QuickLeaveBookingModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
      if (defaultStartDate) {
        setStartDate(defaultStartDate.toISOString().split("T")[0]);
      }
      if (defaultEndDate) {
        setEndDate(defaultEndDate.toISOString().split("T")[0]);
      }
    }
  }, [open, defaultStartDate, defaultEndDate]);

  const fetchData = async () => {
    try {
      const [empRes, catRes] = await Promise.all([
        fetch("/api/employees?limit=1000"),
        fetch("/api/event-categories"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        const employeeList = empData.data || [];
        console.log("Loaded employees:", employeeList.length);
        // Map to the expected format with nested user object
        const mappedEmployees = employeeList.map((emp: any) => ({
          id: emp.id,
          user: {
            firstName: emp.firstName,
            lastName: emp.lastName,
            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || null,
            profileImageUrl: emp.profileImageUrl,
          },
          department: emp.departmentName ? { name: emp.departmentName } : null,
        }));
        setEmployees(mappedEmployees);
      } else {
        console.error("Failed to fetch employees:", empRes.status);
        toast.error("Failed to load employees");
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      } else {
        console.error("Failed to fetch categories:", catRes.status);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a leave type");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCategoryId: selectedCategory,
          startDate,
          endDate,
          reason,
          dayType: "FULL_DAY",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to book leave");
        return;
      }

      toast.success("Leave booked successfully");
      setOpen(false);
      resetForm();
      onSubmitted();
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const selectedEmp = employees.find((e) => e.id === selectedEmployee);
  const getEmployeeName = (emp: Employee) => {
    return emp.user?.name || `${emp.user?.firstName || ""} ${emp.user?.lastName || ""}`.trim() || "Unknown";
  };

  // Command component handles filtering internally, we just need all employees
  const filteredEmployees = employees;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Book Leave for Employee
          </DialogTitle>
          <DialogDescription>
            Quickly book time off for any employee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Employee *</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedEmp ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={selectedEmp.user?.profileImageUrl || null}
                        name={getEmployeeName(selectedEmp)}
                        size={20}
                      />
                      <span>{getEmployeeName(selectedEmp)}</span>
                      {selectedEmp.department && (
                        <span className="text-xs text-muted-foreground">
                          ({selectedEmp.department.name})
                        </span>
                      )}
                    </div>
                  ) : (
                    "Select employee..."
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={true}>
                  <CommandInput
                    placeholder="Search employees..."
                  />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {filteredEmployees.slice(0, 100).map((emp) => {
                        const empName = getEmployeeName(emp);
                        const searchValue = `${empName} ${emp.department?.name || ""}`.toLowerCase();
                        return (
                        <CommandItem
                          key={emp.id}
                          value={searchValue}
                          onSelect={() => {
                            setSelectedEmployee(emp.id);
                            setSearchOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Avatar
                              src={emp.user?.profileImageUrl || null}
                              name={getEmployeeName(emp)}
                              size={24}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {getEmployeeName(emp)}
                              </div>
                              {emp.department && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {emp.department.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Leave Type *</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => {
                  const Icon = getEventCategoryIcon(cat.iconKey);
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Reason (optional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for this leave"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              loading={loading}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Leave
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

