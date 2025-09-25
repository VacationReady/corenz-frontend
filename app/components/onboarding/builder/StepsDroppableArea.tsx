"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

export function StepsDroppableArea({ children }: { children: React.ReactNode }) {
	const { setNodeRef, isOver } = useDroppable({ id: "steps-canvas" });
	return (
		<div
			ref={setNodeRef}
			className={
				`xl:col-span-2 rounded-xl ${
					isOver ? "border-2 border-dashed border-blue-300 bg-blue-50/30" : ""
				}`
			}
		>
			{children}
		</div>
	);
}


