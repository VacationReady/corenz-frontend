"use client";

import React from "react";
import OnboardingStepRenderer from "../OnboardingStepRenderer";

export function OnboardingPreviewPane({
	step,
	employeeId,
}: {
	step: any | null;
	employeeId?: string;
}) {
	return (
		<div className="xl:col-span-1 xl:sticky xl:top-4 self-start">
			<div className="border rounded-xl p-4 bg-white shadow-sm">
				<h3 className="font-semibold mb-3 text-lg">Preview</h3>
				{step ? (
					<div>
						<OnboardingStepRenderer
							step={{
								// Pass-through existing step fields; renderer is defensive
								...step,
								id: step.id || step.key || "preview",
							}}
							readOnly
							employeeId={employeeId}
							onComplete={() => {}}
						/>
					</div>
				) : (
					<p className="text-gray-500 italic">Select a step to preview</p>
				)}
			</div>
		</div>
	);
}


