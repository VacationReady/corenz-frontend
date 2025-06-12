export default function EmployeeSidebar() {
  return (
    <aside className="w-64 bg-white shadow p-4">
      <nav>
        <ul className="space-y-2 text-sm">
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/calendar">My Calendar</a></li>
          <li><a href="/documents">Documents</a></li>
        </ul>
      </nav>
    </aside>
  );
}
