"use client";

import dynamic from "next/dynamic";

const AdminDashboardClient = dynamic(() => import("./AdminDashboardClient"), {
  ssr: false,
});

export default AdminDashboardClient;