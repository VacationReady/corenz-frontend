"use client";

import dynamic from "next/dynamic";

const ProfileAvatarUploader = dynamic(
  () => import("@/components/employees/ProfileAvatarUploader"),
  { ssr: false },
);

export default ProfileAvatarUploader;