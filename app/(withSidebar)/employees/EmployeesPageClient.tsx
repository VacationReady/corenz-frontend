"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import NewDepartmentModal from '@/components/shared/NewDepartmentModal'
import NewJobRoleModal from '@/components/shared/NewJobRoleModal'
import { useSession } from "next-auth/react";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function EmployeesPageClient() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    startDate: "",
    role: "EMPLOYEE",
    departmentId: "",
    jobRoleId: "",
    managerId: "",
  });

  const fetchData = async () => {
    try {
      const [empRes, deptRes, roleRes] = await Promise.all([
        fetch("/api/employees").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
        fetch("/api/job-roles").then((r) => r.json()),
      ]);
      setEmployees(empRes);
      setDepartments(Array.isArray(deptRes) ? deptRes : deptRes.departments || []);
      setJobRoles(Array.isArray(roleRes) ? roleRes : roleRes.jobRoles || []);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        companyId: session?.user?.companyId,
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create employee");
        return;
      }
      setError("");
      setModalOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        startDate: "",
        role: "EMPLOYEE",
        departmentId: "",
        jobRoleId: "",
        managerId: "",
      });
      fetchData();
    } catch {
      setError("Network error");
    }
  };

  // 🟢 New: Handle start onboarding action
  const handleStartOnboarding = async (employeeId: string) => {
    if (!employeeId) return;
    try {
      const res = await fetch(`/api/onboarding/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to start onboarding");
        return;
      }
      alert("Onboarding started!");
      // Optionally refresh data if you show onboarding status per employee
      fetchData();
    } catch {
      alert("Network error while starting onboarding");
    }

  return (
    <PageShell title="Employees" action={<Button onClick={() => setModalOpen(true)}>Add Employee</Button>}>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-100 border-b">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className
