export default function ManagerSidebar() {
  return (
    <aside className="w-64 bg-white shadow p-4">
      <nav>
        <ul className="space-y-2 text-sm">
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/approvals">Leave Approvals</a></li>
          <li><a href="/calendar">Team Calendar</a></li>
        </ul>
      </nav>
    </aside>
  );
}

