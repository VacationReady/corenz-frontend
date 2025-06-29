"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";

export default function DebugModalPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="primary">Open Debug Modal</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Debug Modal</DialogTitle>
            <DialogDescription>
              If you can see this, the Dialog is working in isolation.
            </DialogDescription>
          </DialogHeader>
          <p>This modal proves your environment can render Dialog overlays.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
