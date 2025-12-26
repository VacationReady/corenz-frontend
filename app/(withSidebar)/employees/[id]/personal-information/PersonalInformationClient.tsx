"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import HeaderWithHistory from "@/components/audit/HeaderWithHistory";
import PersonalInfoSaveButton from "@/components/employees/PersonalInfoSaveButton";
import UnsavedChangesGuard from "@/components/ui/UnsavedChangesGuard";
import EmployeeFormCard, { FormSection, FormField } from "@/components/employees/EmployeeFormCard";
import GenderSelectWithManage from "@/components/shared/GenderSelectWithManage";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Globe,
  Hash,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  profileImageUrl: string | null;
  companyId: string | null;
  genderOptionId: string | null;
  pronouns: string | null;
  nationalId: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
  addressCountry: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
}

interface GenderOption {
  id: string;
  label: string;
}

interface PersonalInformationClientProps {
  employeeId: string;
  user: UserData;
  genderOptions: GenderOption[];
  canEdit: boolean;
}

export default function PersonalInformationClient({
  employeeId,
  user,
  genderOptions,
  canEdit,
}: PersonalInformationClientProps) {
  // Format date for input
  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().substring(0, 10);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
      <HeaderWithHistory
        title="Personal information"
        employeeId={employeeId}
        section="personal-info"
        description="Basic details, contact information, and address"
      />

      <UnsavedChangesGuard>
        <form action={`/api/employees/${employeeId}/personal-info`} method="PATCH">
          {/* Basic Details Card */}
          <EmployeeFormCard
            title="Basic Details"
            description="Name, date of birth, and identification"
            icon={User}
            iconColor="from-primary/20 to-blue-500/20"
            delay={0.1}
          >
            <FormSection columns={2}>
              {/* First Name */}
              <FormField label="First name" htmlFor="firstName">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="firstName"
                    name="firstName"
                    defaultValue={user.firstName ?? ""}
                    readOnly={!canEdit}
                    placeholder="Enter first name"
                    className={cn(
                      "h-11 pl-10 rounded-xl",
                      canEdit
                        ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                        : "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Last Name */}
              <FormField label="Last name" htmlFor="lastName">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={user.lastName ?? ""}
                    readOnly={!canEdit}
                    placeholder="Enter last name"
                    className={cn(
                      "h-11 pl-10 rounded-xl",
                      canEdit
                        ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                        : "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Email */}
              <FormField label="Email" htmlFor="email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user.email ?? ""}
                    readOnly={!canEdit}
                    placeholder="email@example.com"
                    className={cn(
                      "h-11 pl-10 rounded-xl",
                      canEdit
                        ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                        : "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Phone */}
              <FormField label="Phone" htmlFor="phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={user.phone ?? ""}
                    readOnly={!canEdit}
                    placeholder="+64 21 234 5678"
                    className={cn(
                      "h-11 pl-10 rounded-xl",
                      canEdit
                        ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                        : "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Date of Birth */}
              <FormField label="Date of birth" htmlFor="dateOfBirth">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    defaultValue={formatDateForInput(user.dateOfBirth)}
                    readOnly={!canEdit}
                    className={cn(
                      "h-11 pl-10 rounded-xl",
                      canEdit
                        ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                        : "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>

              {/* Gender */}
              <FormField label="Gender" htmlFor="gender">
                {canEdit ? (
                  <GenderSelectWithManage
                    value={user.genderOptionId ?? undefined}
                    options={genderOptions}
                  />
                ) : (
                  <Input
                    readOnly
                    defaultValue={
                      genderOptions.find((g) => g.id === user.genderOptionId)?.label || ""
                    }
                    className="h-11 rounded-xl bg-muted/30"
                  />
                )}
              </FormField>

              {/* Pronouns */}
              <FormField label="Pronouns" htmlFor="pronouns">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  {canEdit ? (
                    <select
                      id="pronouns"
                      name="pronouns"
                      defaultValue={user.pronouns ?? ""}
                      className={cn(
                        "flex h-11 w-full rounded-xl border pl-10 pr-3 py-2 text-sm transition-colors",
                        "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-2"
                      )}
                    >
                      <option value="">Select pronouns</option>
                      <option value="She/Her">She/Her</option>
                      <option value="He/Him">He/Him</option>
                      <option value="They/Them">They/Them</option>
                      <option value="She/They">She/They</option>
                      <option value="He/They">He/They</option>
                      <option value="Any pronouns">Any pronouns</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  ) : (
                    <Input
                      readOnly
                      defaultValue={user.pronouns ?? ""}
                      className="h-11 pl-10 rounded-xl bg-muted/30"
                    />
                  )}
                </div>
              </FormField>

            </FormSection>
          </EmployeeFormCard>

          {/* Address Card */}
          <EmployeeFormCard
            title="Address"
            description="Home address information"
            icon={MapPin}
            iconColor="from-primary/20 to-blue-500/20"
            delay={0.2}
            className="mt-6"
          >
            <FormSection columns={2}>
              {/* Street */}
              <div className="md:col-span-2">
                <FormField label="Street" htmlFor="addressStreet">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="addressStreet"
                      name="addressStreet"
                      defaultValue={user.addressStreet ?? ""}
                      readOnly={!canEdit}
                      placeholder="123 Main Street"
                      className={cn(
                        "h-11 pl-10 rounded-xl",
                        canEdit
                          ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                          : "bg-muted/30"
                      )}
                    />
                  </div>
                </FormField>
              </div>

            {/* City */}
            <FormField label="City" htmlFor="addressCity">
              <Input
                id="addressCity"
                name="addressCity"
                defaultValue={user.addressCity ?? ""}
                readOnly={!canEdit}
                placeholder="Wellington"
                className={cn(
                  "h-11 rounded-xl",
                  canEdit
                    ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                    : "bg-muted/30"
                )}
              />
            </FormField>

            {/* Postcode */}
            <FormField label="Postcode" htmlFor="addressPostcode">
              <Input
                id="addressPostcode"
                name="addressPostcode"
                defaultValue={user.addressPostcode ?? ""}
                readOnly={!canEdit}
                placeholder="6011"
                className={cn(
                  "h-11 rounded-xl",
                  canEdit
                    ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                    : "bg-muted/30"
                )}
              />
            </FormField>

            {/* Country */}
            <div className="md:col-span-2">
              <FormField label="Country" htmlFor="addressCountry">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="addressCountry"
                    name="addressCountry"
                    defaultValue={user.addressCountry ?? ""}
                    readOnly={!canEdit}
                    placeholder="New Zealand"
                    className={cn(
                      "h-11 pl-10 rounded-xl",
                      canEdit
                        ? "bg-white/50 dark:bg-white/5 border-muted/50 focus:border-primary focus:ring-primary/20"
                        : "bg-muted/30"
                    )}
                  />
                </div>
              </FormField>
            </div>
            </FormSection>
          </EmployeeFormCard>

          {/* Save Button */}
          {canEdit && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-end pt-4"
            >
              <PersonalInfoSaveButton employeeId={employeeId} section="personal-info" />
            </motion.div>
          )}
        </form>
      </UnsavedChangesGuard>
    </div>
  );
}

