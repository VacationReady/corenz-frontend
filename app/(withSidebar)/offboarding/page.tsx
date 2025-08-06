"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserX, Clock, CheckCircle, AlertCircle, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface OffboardingRecord {
  id: string;
  status: string;
  lastWorkingDate: string;
  offboardingType: string;
  completedAt?: string;
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  employee: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    department?: {
      id: string;
      name: string;
    };
    jobRole?: {
      id: string;
      name: string;
    };
  };
  initiatedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const statusColors = {
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const typeColors = {
  RESIGNATION: "bg-blue-100 text-blue-800",
  TERMINATION: "bg-red-100 text-red-800",
  RETIREMENT: "bg-purple-100 text-purple-800",
  END_OF_CONTRACT: "bg-orange-100 text-orange-800",
  REDUNDANCY: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export default function OffboardingPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<OffboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchOffboardingRecords();
  }, [activeTab]);

  const fetchOffboardingRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/offboarding?status=${activeTab}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error("Error fetching offboarding records:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4" />;
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      case "CANCELLED":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <UserX className="w-4 h-4" />;
    }
  };

  const filteredRecords = records.filter(record => {
    if (activeTab === "all") return true;
    return record.status === activeTab.toUpperCase();
  });

  return (
    <PageShell
      title="Offboarding Management"
      description="Track and manage employee offboarding processes"
      icon={<UserX className="w-6 h-6" />}
    >
      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">
            All ({records.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({records.filter(r => r.status === "IN_PROGRESS").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({records.filter(r => r.status === "COMPLETED").length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({records.filter(r => r.status === "CANCELLED").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offboardings</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {records.filter(r => r.status === "IN_PROGRESS").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {records.filter(r => r.status === "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records.length > 0 
                ? Math.round(records.reduce((sum, r) => sum + r.completionPercentage, 0) / records.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offboarding Records */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading offboarding records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No offboarding records found.</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      <div>
                        <CardTitle className="text-lg">
                          <Link 
                            href={`/employees/${record.employee.id}/overview`}
                            className="hover:text-primary transition-colors"
                          >
                            {record.employee.user.firstName} {record.employee.user.lastName}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          {record.employee.jobRole?.name} • {record.employee.department?.name}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={statusColors[record.status as keyof typeof statusColors]}>
                      {record.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={typeColors[record.offboardingType as keyof typeof typeColors]}>
                      {record.offboardingType.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Last Working Date</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(record.lastWorkingDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Initiated By</span>
                    </div>
                    <p className="font-medium">
                      {record.initiatedBy.firstName} {record.initiatedBy.lastName}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{record.completedTasks}/{record.totalTasks} tasks</span>
                    </div>
                    <Progress value={record.completionPercentage} className="w-full" />
                  </div>
                </div>
                
                {record.status === "COMPLETED" && record.completedAt && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Completed on {format(new Date(record.completedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
}