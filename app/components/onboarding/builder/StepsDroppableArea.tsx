"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

export function StepsDroppableArea({ children }: { children: React.ReactNode }) {
	const { setNodeRef, isOver } = useDroppable({ id: "steps-canvas" });
	return (
		<div
			ref={setNodeRef}
			className={
				isOver
					? "xl:col-span-2 border-2 border-dashed border-blue-300 rounded-xl p-2"
					: "xl:col-span-2"
			}
		>
			{children}
		</div>
	);
}


