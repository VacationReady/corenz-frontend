'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Download, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmployeeStatus {
  id: string;
  name: string;
  email: string;
  department?: string;
  location?: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT';
  clockInTime?: string;
  hoursWorked?: number;
  clockInLocation?: any;
}

interface ActivityFeed {
  employeeName: string;
  action: 'CLOCKED_IN' | 'CLOCKED_OUT';
  location?: string;
  timestamp: string;
  clockInTime?: string;
  clockOutTime?: string;
}

interface LiveAttendanceData {
  summary: {
    totalEmployees: number;
    totalClockedIn: number;
    totalClockedOut: number;
    attendanceRate: string;
  };
  employees: EmployeeStatus[];
  recentActivity: ActivityFeed[];
  timestamp: string;
}

export default function LiveAttendancePage() {
  const [data, setData] = useState<LiveAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('departmentId', selectedDepartment);
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);

      const response = await fetch(`/api/time-tracking/live?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading live attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadDepartments();
    loadLocations();
  }, [selectedDepartment, selectedLocation]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDepartment, selectedLocation]);

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const result = await response.json();
      setDepartments(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      setLocations(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleExport = () => {
    if (!data) return;

    try {
      // Generate CSV content
      const headers = ['Name', 'Email', 'Department', 'Location', 'Status', 'Clock In Time', 'Hours Worked'];
      const rows = data.employees.map(emp => [
        emp.name,
        emp.email,
        emp.department || 'N/A',
        emp.location || 'N/A',
        emp.status,
        emp.clockInTime ? new Date(emp.clockInTime).toLocaleString() : 'N/A',
        emp.hoursWorked ? emp.hoursWorked.toFixed(2) : '0'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `live_attendance_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Attendance data exported successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export attendance data',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'CLOCKED_IN' ? 'bg-green-500' : 'bg-gray-500';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading live attendance data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">Failed to load attendance data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Attendance</h1>
          <p className="text-muted-foreground">
            Real-time employee clock in/out monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clocked In</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {data.summary.totalClockedIn}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clocked Out</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {data.summary.totalClockedOut}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {data.summary.attendanceRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Employee Grid</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div
                      className={`h-3 w-3 rounded-full ${getStatusColor(employee.status)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{employee.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {employee.department || 'No Department'}
                      </p>
                      {employee.status === 'CLOCKED_IN' && employee.clockInTime && (
                        <p className="text-xs text-muted-foreground">
                          Clocked in at {formatTime(employee.clockInTime)} •{' '}
                          {employee.hoursWorked?.toFixed(1)}h
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={employee.status === 'CLOCKED_IN' ? 'default' : 'secondary'}
                    >
                      {employee.status === 'CLOCKED_IN' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 border-b last:border-0"
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        activity.action === 'CLOCKED_IN' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{activity.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action === 'CLOCKED_IN' ? 'Clocked in' : 'Clocked out'}
                        {activity.location && ` at ${activity.location}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatTime(activity.timestamp)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
