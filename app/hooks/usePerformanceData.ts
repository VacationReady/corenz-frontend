import { useMemo } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = (errorPayload && (errorPayload.error || errorPayload.message)) || "Request failed";
    throw new Error(message);
  }
  return response.json();
};

interface UsePerformanceDataOptions {
  timeframeDays?: number;
  employeeId?: string;
  participantId?: string;
}

interface ObjectiveKeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
}

interface ObjectiveOwner {
  firstName: string;
  lastName: string;
  department?: { id: string; name: string } | null;
  jobRole?: { id: string; name: string } | null;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  priority: string;
  dueDate?: string;
  type: string;
  Owner?: ObjectiveOwner | null;
  keyResults?: ObjectiveKeyResult[];
}

interface MeetingActionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  Assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ActionItemWithSource extends MeetingActionItem {
  sourceMeetingId: string;
  sourceMeetingTitle: string;
  type: 'MEETING';
}

export interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  duration: number;
  participantIds: string[];
  Organizer: { firstName: string; lastName: string };
  actionItems?: MeetingActionItem[];
}

export interface PerformanceStats {
  totalObjectives: number;
  completedObjectives: number;
  inProgressObjectives: number;
  atRiskObjectives: number;
  overdueObjectives: number;
  upcomingMeetings: number;
  completedMeetings: number;
  pendingActionItems: number;
}

export function usePerformanceData({ timeframeDays = 30, employeeId, participantId }: UsePerformanceDataOptions = {}) {
  const objectivesKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("includeKeyResults", "true");
    if (employeeId) {
      params.set("employeeId", employeeId);
    }
    return `/api/objectives?${params.toString()}`;
  }, [employeeId]);

  const meetingsWindowKey = useMemo(() => {
    const now = new Date();
    const from = now.toISOString();
    const to = new Date(now.getTime() + timeframeDays * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ from, to });
    if (participantId) {
      params.set("participantId", participantId);
    }
    return `/api/performance/meetings?${params.toString()}`;
  }, [participantId, timeframeDays]);

  const {
    data: objectivesData,
    error: objectivesError,
    isLoading: objectivesLoading,
    mutate: mutateObjectives,
  } = useSWR<{ objectives: Objective[] }>(objectivesKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const {
    data: meetingsData,
    error: meetingsError,
    isLoading: meetingsLoading,
    mutate: mutateMeetings,
  } = useSWR<{ meetings: Meeting[] }>(meetingsWindowKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 5000,
  });

  const actionItems: ActionItemWithSource[] = useMemo(() => {
    const meetings = meetingsData?.meetings ?? [];
    const items: ActionItemWithSource[] = [];
    
    meetings.forEach((meeting) => {
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        meeting.actionItems.forEach((item) => {
          items.push({
            ...item,
            sourceMeetingId: meeting.id,
            sourceMeetingTitle: meeting.title,
            type: 'MEETING' as const,
          });
        });
      }
    });
    
    return items;
  }, [meetingsData?.meetings]);

  const stats: PerformanceStats = useMemo(() => {
    const objectives = objectivesData?.objectives ?? [];
    const meetings = meetingsData?.meetings ?? [];

    const nowDate = new Date();

    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter((obj) => obj.status === "COMPLETED").length;
    const inProgressObjectives = objectives.filter((obj) => obj.status === "IN_PROGRESS").length;
    const atRiskObjectives = objectives.filter((obj) => obj.status === "AT_RISK").length;
    const overdueObjectives = objectives.filter((obj) => {
      if (!obj.dueDate) return false;
      const due = new Date(obj.dueDate);
      return due < nowDate && obj.status !== "COMPLETED";
    }).length;

    const upcomingMeetings = meetings.filter((meeting) => meeting.status === "SCHEDULED").length;
    const completedMeetings = meetings.filter((meeting) => meeting.status === "COMPLETED").length;
    const pendingActionItems = actionItems.length;

    return {
      totalObjectives,
      completedObjectives,
      inProgressObjectives,
      atRiskObjectives,
      overdueObjectives,
      upcomingMeetings,
      completedMeetings,
      pendingActionItems,
    };
  }, [objectivesData?.objectives, meetingsData?.meetings, actionItems]);

  const refresh = () => {
    void mutateObjectives();
    void mutateMeetings();
  };

  return {
    objectives: objectivesData?.objectives ?? [],
    meetings: meetingsData?.meetings ?? [],
    actionItems,
    stats,
    isLoading: objectivesLoading || meetingsLoading,
    error: objectivesError ?? meetingsError,
    refresh,
  };
}
