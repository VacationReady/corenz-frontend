import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type InsightFilters = {
	templateId?: string;
	departmentId?: string;
	jobRoleId?: string;
};

export type OnboardingTemplateInsight = {
	templateId: string;
	templateName: string;
	averageHours: number | null;
	completionRate: number;
	activeCount: number;
};

export type OutstandingStepInsight = {
	instanceId: string;
	stepInstanceId: string;
	stepLabel: string;
	status: string;
	order: number;
	employeeId: string;
	employeeName: string;
	department?: string | null;
	jobRole?: string | null;
	templateName: string;
	startedAt: string | null;
	slaDays?: number | null;
	daysOutstanding: number;
	slaBreached: boolean;
};

export type OnboardingInsights = {
	summary: {
		assigned: number;
		inProgress: number;
		completed: number;
	};
	timeToComplete: {
		averageHours: number | null;
		medianHours: number | null;
		templateBreakdown: OnboardingTemplateInsight[];
	};
	outstandingSteps: OutstandingStepInsight[];
	funnel: {
		assigned: number;
		started: number;
		completed: number;
	};
	aging: {
		greaterThan3Days: number;
		greaterThan7Days: number;
	};
	forecasts: {
		expectedCompletionsNext7Days: number;
		expectedCompletionsNext14Days: number;
		upcomingStartsNext14Days: number;
	};
	departmentCohorts: {
		department: string;
		count: number;
		percent: number;
	}[];
	templateActivation: {
		activeTemplates: number;
		templatesWithSla: number;
	};
	generatedAt: string;
};

function diffInHours(start?: Date | null, end?: Date | null) {
	if (!start || !end) return null;
	const ms = end.getTime() - start.getTime();
	if (ms <= 0) return 0;
	return ms / 1000 / 60 / 60;
}

function median(values: number[]) {
	if (!values.length) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return (sorted[mid - 1] + sorted[mid]) / 2;
	}
	return sorted[mid];
}

export async function getOnboardingInsights(
	companyId: string,
	filters: InsightFilters = {},
): Promise<OnboardingInsights> {
	const { templateId, departmentId, jobRoleId } = filters;

	const instances = await prisma.onboardingInstance.findMany({
		where: {
			OnboardingTemplate: {
				companyId,
			},
			...(templateId ? { templateId } : {}),
			...((departmentId || jobRoleId)
				? {
					Employee: {
						...(departmentId ? { departmentId } : {}),
						...(jobRoleId ? { jobRoleId } : {}),
					},
				}
				: {}),
		},
		include: {
			OnboardingTemplate: true,
			Employee: {
				include: {
					Department: true,
					JobRole: true,
					User: { select: { firstName: true, lastName: true, email: true } },
				},
			},
			OnboardingStepInstance: {
				include: {
					OnboardingStep: true,
				},
			},
		},
	});

	const assigned = instances.length;
	const completedInstances = instances.filter((inst) => !!inst.completedAt);
	const inProgress = instances.filter(
		(inst) => inst.status === "in_progress" || (!inst.completedAt && inst.OnboardingStepInstance.some((s) => s.status === "completed")),
	).length;

	const completionDurations = completedInstances
		.map((inst) => diffInHours(inst.startedAt, inst.completedAt))
		.filter((value): value is number => value != null);

	const averageHours = completionDurations.length
		? completionDurations.reduce((sum, val) => sum + val, 0) / completionDurations.length
		: null;
	const medianHours = median(completionDurations);

	const templateMap = new Map<string, OnboardingTemplateInsight>();
	instances.forEach((inst) => {
		const key = inst.templateId;
		if (!templateMap.has(key)) {
			templateMap.set(key, {
				templateId: key,
				templateName: inst.OnboardingTemplate.name,
				averageHours: null,
				completionRate: 0,
				activeCount: 0,
			});
		}
		const entry = templateMap.get(key)!;
		entry.activeCount += 1;
	});

	templateMap.forEach((entry, key) => {
		const scoped = instances.filter((inst) => inst.templateId === key);
		const completed = scoped.filter((inst) => !!inst.completedAt);
		const durations = completed
			.map((inst) => diffInHours(inst.startedAt, inst.completedAt))
			.filter((value): value is number => value != null);
		entry.averageHours = durations.length
			? durations.reduce((sum, val) => sum + val, 0) / durations.length
			: null;
		entry.completionRate = scoped.length ? completed.length / scoped.length : 0;
	});

	const outstandingSteps: OutstandingStepInsight[] = [];
	const now = Date.now();

	instances.forEach((inst) => {
		inst.OnboardingStepInstance.filter((step) => step.status !== "completed").forEach((step) => {
			const employeeName = inst.Employee.User
				? `${inst.Employee.User.firstName ?? ""} ${inst.Employee.User.lastName ?? ""}`.trim() || inst.Employee.User.email
				: "Unknown";
			const startedDate = inst.startedAt ? new Date(inst.startedAt) : null;
			const daysOutstanding = startedDate
				? Math.max(0, Math.floor((now - startedDate.getTime()) / (1000 * 60 * 60 * 24)))
				: 0;
			const slaDays = step.OnboardingStep?.slaDays ?? null;
			const slaBreached = slaDays != null ? daysOutstanding > slaDays : false;

			outstandingSteps.push({
				instanceId: inst.id,
				stepInstanceId: step.id,
				stepLabel: step.OnboardingStep?.label || step.id,
				status: step.status,
				order: step.order,
				employeeId: inst.employeeId,
				employeeName,
				department: inst.Employee.Department?.name ?? null,
				jobRole: inst.Employee.JobRole?.name ?? null,
				templateName: inst.OnboardingTemplate.name,
				startedAt: startedDate?.toISOString() ?? null,
				slaDays,
				daysOutstanding,
				slaBreached,
			});
		});
	});

	const greaterThan3Days = instances.filter((inst) => !inst.completedAt && (now - inst.startedAt.getTime()) > 3 * 24 * 60 * 60 * 1000).length;
	const greaterThan7Days = instances.filter((inst) => !inst.completedAt && (now - inst.startedAt.getTime()) > 7 * 24 * 60 * 60 * 1000).length;

	const completionRatios = instances.map((inst) => {
		const total = inst.OnboardingStepInstance.length;
		if (!total) return 0;
		const completed = inst.OnboardingStepInstance.filter((step) => step.status === "completed").length;
		return completed / total;
	});

	const expectedCompletionsNext7Days = completionRatios.filter((ratio) => ratio >= 0.8 && ratio < 1).length;
	const expectedCompletionsNext14Days = completionRatios.filter((ratio) => ratio >= 0.5 && ratio < 0.8).length;

	const upcomingStartsNext14Days = await prisma.employee.count({
		where: {
			companyId,
			startDate: {
				gte: new Date(),
				lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			},
			onboardingStatus: { equals: Prisma.JsonNull },
		},
	});

	const departmentCounts = new Map<string, number>();
	instances.forEach((inst) => {
		const dept = inst.Employee.Department?.name ?? "Unassigned";
		departmentCounts.set(dept, (departmentCounts.get(dept) ?? 0) + 1);
	});

	const departmentCohorts = Array.from(departmentCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([department, count]) => ({
			department,
			count,
			percent: assigned ? count / assigned : 0,
		}));

	const activeTemplates = await prisma.onboardingTemplate.count({ where: { companyId, isActive: true } });
	const templatesWithSla = await prisma.onboardingStep.count({
		where: {
			OnboardingTemplate: { companyId },
			slaDays: { not: null },
		},
	});

	return {
		summary: {
			assigned,
			inProgress,
			completed: completedInstances.length,
		},
		timeToComplete: {
			averageHours,
			medianHours,
			templateBreakdown: Array.from(templateMap.values()).sort((a, b) => {
				if (a.averageHours == null && b.averageHours == null) return 0;
				if (a.averageHours == null) return 1;
				if (b.averageHours == null) return -1;
				return b.averageHours - a.averageHours;
			}),
		},
		outstandingSteps: outstandingSteps
			.sort((a, b) => b.daysOutstanding - a.daysOutstanding)
			.slice(0, 40),
		funnel: {
			assigned,
			started: instances.filter((inst) => inst.OnboardingStepInstance.some((step) => step.status === "completed" || step.status === "in_progress")).length,
			completed: completedInstances.length,
		},
		aging: {
			greaterThan3Days,
			greaterThan7Days,
		},
		forecasts: {
			expectedCompletionsNext7Days,
			expectedCompletionsNext14Days,
			upcomingStartsNext14Days,
		},
		departmentCohorts,
		templateActivation: {
			activeTemplates,
			templatesWithSla,
		},
		generatedAt: new Date().toISOString(),
	};
}
