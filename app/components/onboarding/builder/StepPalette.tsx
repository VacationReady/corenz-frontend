"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

type StepTypeItem = {
	value: string;
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
};

export function StepPalette({ stepTypes }: { stepTypes: StepTypeItem[] }) {
	return (
		<div className="xl:col-span-1">
			<div className="border rounded-xl p-4 bg-white shadow-sm">
				<h3 className="font-semibold mb-3 text-lg">Add Steps</h3>
				<div className="grid grid-cols-1 gap-2">
					{stepTypes.map((t) => (
						<DraggableStep key={t.value} item={t} />
					))}
				</div>
			</div>
		</div>
	);
}

function DraggableStep({ item }: { item: StepTypeItem }) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: `step-type-${item.value}`,
		data: { source: "step-palette", type: item.value, label: item.label },
	});

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		opacity: isDragging ? 0.6 : 1,
		cursor: "grab",
	};

	const Icon = item.icon;

	return (
		<button
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			style={style}
			type="button"
			className="flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-50 text-left"
			aria-label={`Drag ${item.label} step`}
		>
			{Icon ? <Icon className="w-4 h-4 text-gray-500" /> : null}
			<span className="text-sm font-medium">{item.label}</span>
		</button>
	);
}


