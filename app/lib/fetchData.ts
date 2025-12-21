// lib/fetchData.ts

export async function fetchEmployees() {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error("Failed to fetch employees");
  const json = await res.json();
  // API returns { data: [...], pagination: {...} } - extract the data array
  return json.data || json;
}

export async function fetchDepartments() {
  const res = await fetch("/api/departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

