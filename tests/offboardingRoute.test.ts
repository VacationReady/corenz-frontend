import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockOffboarding: any = {
  id: "o1",
  status: "SCHEDULED",
  initiatedAt: new Date().toISOString(),
  completedAt: null,
  employee: {
    id: "e1",
    user: { firstName: "Foo", lastName: "Bar", email: "foo@example.com" },
    department: { name: "HR" },
    jobRole: { name: "Dev" },
    isActive: true,
  },
  initiatedBy: {
    id: "u1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
  },
  interviewerUser: null,
  interviewerName: "Manager",
  interviewerEmail: "manager@example.com",
  exitInterviewDate: null,
  exitInterviewEnd: null,
  location: null,
  exitInterviewNotes: null,
  sendForm: true,
  formTemplate: {
    id: "t1",
    name: "Exit",
    description: "",
    schemaJson: [{ id: "q1", label: "Q1", type: "text" }],
  },
  formTiming: "ON_DATE",
  completionStatus: "SUBMITTED",
  inviteLastSentAt: null,
  scheduledSendAt: null,
  exitInterviewSubmissions: [
    {
      id: "s1",
      template: { id: "t1", name: "Exit" },
      submittedAt: new Date().toISOString(),
      submittedBy: "user",
      answersJson: { q1: "Answer1" },
    },
  ],
  tasks: [],
  lastWorkingDate: null,
  offboardingType: null,
  offboardingReason: null,
  isVoluntary: true,
  noticePeriodDays: null,
  resignationDate: null,
  removeAccessImmediately: false,
  accessRemovedAt: null,
  accessRemovedBy: null,
  assetsToReturn: null,
  assetsReturned: false,
  assetsReturnedAt: null,
  handoverRequired: false,
  handoverAssignedTo: null,
  handoverCompleted: false,
  handoverCompletedAt: null,
  handoverNotes: null,
  finalPayCalculated: false,
  finalPayAmount: null,
  unusedLeaveHours: null,
  unusedLeavePayment: null,
  benefitsEndDate: null,
  hrReviewRequired: false,
  hrReviewCompleted: false,
  hrReviewCompletedBy: null,
  hrReviewCompletedAt: null,
  hrNotes: null,
  referenceContactAllowed: false,
  documentationArchived: false,
  complianceCheckCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("GET /api/offboarding/[employeeId] includes answersJson", async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          employeeOffboarding: {
            findUnique: async () => mockOffboarding,
          },
        },
      };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "next-auth") {
      return {
        getServerSession: async () => ({ user: { id: "u1", role: "ADMIN" } }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const { GET } = await import("../app/api/offboarding/[employeeId]/route");
  const res = await GET({} as any, { params: { employeeId: "e1" } });
  const data = await res.json();
  assert.deepEqual(data.formSubmissions[0].answersJson, { q1: "Answer1" });
  (Module as any)._load = originalLoad;
});
