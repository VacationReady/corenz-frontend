export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-white shadow p-4">
      <nav>
        <ul className="space-y-2 text-sm">
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/approvals">Approvals</a></li>
          <li><a href="/employees">Employees</a></li>
          <li><a href="/reports">Reports</a></li>
        </ul>
      </nav>
    </aside>
  );
}
