import { Suspense } from "react";
import ActivateClient from "./ActivateClient";

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <ActivateClient />
    </Suspense>
  );
}