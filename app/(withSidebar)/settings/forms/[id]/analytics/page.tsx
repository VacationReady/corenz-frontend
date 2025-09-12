"use client";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BarChart3, Users, FileText, TrendingUp } from "lucide-react";

export default function FormAnalyticsPage() {
  const params = useParams();
  const formId = params?.id ? String(params.id) : "";

  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Forms & Surveys', href: '/settings/forms' },
    { label: 'Form Analytics', isCurrentPage: true }
  ];

  if (!formId) {
    return (
      <PageShell
        title="Form Analytics"
        description="View submission statistics and insights"
<<<<<<< HEAD
=======
        breadcrumbs={{ items: breadcrumbItems }}
        showHomeIcon={false}
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
      >
        <div className="flex items-center justify-center h-64 text-gray-500">
          Invalid form ID.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Form Analytics"
      description="View submission statistics and insights"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Submissions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No submissions yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No users yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Detailed form analytics and insights will be available here soon.
            </p>
            <p className="text-sm text-gray-500">
              Features will include submission trends, completion rates, user
              engagement metrics, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
