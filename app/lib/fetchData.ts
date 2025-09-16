// lib/fetchData.ts

export async function fetchEmployees() {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error("Failed to fetch employees");
  return res.json();
}

export async function fetchDepartments() {
  const res = await fetch("/api/departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

