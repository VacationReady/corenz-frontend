"use client";

import { useState, useEffect } from "react";
import { X, Users, MapPin, Building2, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  startDate?: string;
  department?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
  };
  jobRole?: {
    id: string;
    name: string;
  };
  employmentType?: string;
  contractType?: string;
}

interface EmployeeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  filterType: "department" | "location" | "jobRole" | "employmentType" | "contractType" | "tenureBand" | "newHires" | "departures" | "contractsExpiring";
  filterValue: string;
  companyId: string;
}

export function EmployeeListModal({
  isOpen,
  onClose,
  title,
  description,
  filterType,
  filterValue,
  companyId,
}: EmployeeListModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && filterValue) {
      fetchEmployees();
    }
  }, [isOpen, filterType, filterValue, companyId]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        filterType,
        filterValue,
        companyId,
      });

      const response = await fetch(`/api/analytics/people/employees?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const getTenureMonths = (startDate?: string) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  };

  const getTenureBand = (startDate?: string) => {
    const months = getTenureMonths(startDate);
    if (months === null) return "Unknown";
    if (months < 12) return "Under 1 year";
    if (months < 36) return "1-3 years";
    if (months < 60) return "3-5 years";
    return "5+ years";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button onClick={fetchEmployees} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No employees found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center space-x-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <div className="flex items-center justify-center w-full h-full bg-primary/10 text-primary font-semibold">
                      {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </div>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <Badge variant={employee.isActive ? "default" : "secondary"}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                  </div>

                  <div className="flex flex-col space-y-1 text-sm text-muted-foreground">
                    {employee.department && (
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-3 w-3" />
                        <span>{employee.department.name}</span>
                      </div>
                    )}
                    {employee.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{employee.location.name}</span>
                      </div>
                    )}
                    {employee.jobRole && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{employee.jobRole.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1 text-sm text-muted-foreground">
                    {employee.startDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Started {formatDate(employee.startDate)}</span>
                      </div>
                    )}
                    {employee.employmentType && (
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {employee.employmentType}
                        </Badge>
                      </div>
                    )}
                    {employee.contractType && (
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {employee.contractType}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {filterType === "tenureBand" && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{getTenureBand(employee.startDate)}</span>
                      <br />
                      <span className="text-xs">
                        {getTenureMonths(employee.startDate)} months
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {employees.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {employees.length} employee{employees.length !== 1 ? "s" : ""}
              </p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
