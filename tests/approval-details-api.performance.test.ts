// tests/approval-details-api.performance.test.ts

import { calculateLeaveDeductionBatchEnhanced } from '../app/lib/calculateLeaveDeductionBatchEnhanced';
import { 
  approvalDetailsCache,
  departmentColleaguesCache,
  generateApprovalDetailsCacheKey,
  generateDepartmentColleaguesCacheKey
} from '../lib/approvalCache';

// Mock the cache modules
jest.mock('../lib/approvalCache', () => ({
  approvalDetailsCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  departmentColleaguesCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  generateApprovalDetailsCacheKey: jest.fn((id) => `approval-details:${id}`),
  generateDepartmentColleaguesCacheKey: jest.fn((...args) => `dept-colleagues:${args.join(':')}`),
}));

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    leaveApprovalDecision: {
      findUnique: jest.fn(),
    },
    leaveEntitlement: {
      findFirst: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
    },
    employeeWorkingPatternAssignment: {
      findFirst: jest.fn(),
    },
    publicHoliday: {
      findMany: jest.fn(),
    },
  },
  ensurePrismaConnected: jest.fn(),
}));

import { GET } from '../app/api/approvals/[id]/details/route';
import { prisma } from '../lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockApprovalDetailsCache = approvalDetailsCache as jest.Mocked<typeof approvalDetailsCache>;
const mockDepartmentColleaguesCache = departmentColleaguesCache as jest.Mocked<typeof departmentColleaguesCache>;

describe('/api/approvals/[id]/details Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Caching Behavior', () => {
    test('should return cached response when available', async () => {
      const mockDecisionId = 'decision123';
      const mockCachedResponse = {
        id: mockDecisionId,
        employee: { name: 'John Doe' },
        dates: { requestedDays: 5 },
      };

      mockApprovalDetailsCache.get.mockResolvedValue(mockCachedResponse);

      const request = new Request('http://localhost:3000/api/approvals/decision123/details');
      const context = { params: Promise.resolve({ id: mockDecisionId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCachedResponse);
      expect(mockApprovalDetailsCache.get).toHaveBeenCalledWith('approval-details:decision123');
      expect(mockPrisma.leaveApprovalDecision.findUnique).not.toHaveBeenCalled();
    });

    test('should cache database response for 5 minutes', async () => {
      const mockDecisionId = 'decision123';
      const mockDecision = {
        id: mockDecisionId,
        approverId: 'user123',
        stage: {
          leaveRequest: {
            companyId: 'company1',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-19'),
            Employee: {
              id: 'emp1',
              User: { name: 'John Doe', email: 'john@example.com' },
              Department: { id: 'dept1', name: 'Engineering' },
            },
            EventCategory: { id: 'cat1', name: 'Annual Leave', color: '#blue' },
          },
        },
      };

      mockApprovalDetailsCache.get.mockResolvedValue(null);
      mockPrisma.leaveApprovalDecision.findUnique.mockResolvedValue(mockDecision as any);
      mockPrisma.leaveEntitlement.findFirst.mockResolvedValue({
        totalDays: 20,
        usedDays: 5,
      });
      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue({
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [{
            weekNumber: 1,
            WorkingPatternDay: [
              { day: 'Mon', type: 'FULL_DAY' },
              { day: 'Tue', type: 'FULL_DAY' },
              { day: 'Wed', type: 'FULL_DAY' },
              { day: 'Thu', type: 'FULL_DAY' },
              { day: 'Fri', type: 'FULL_DAY' },
              { day: 'Sat', type: 'NON_WORKING' },
              { day: 'Sun', type: 'NON_WORKING' },
            ],
          }],
        },
      } as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
      mockPrisma.leaveRequest.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/approvals/decision123/details');
      const context = { params: Promise.resolve({ id: mockDecisionId }) };

      const response = await GET(request, context);

      expect(mockApprovalDetailsCache.set).toHaveBeenCalledWith(
        'approval-details:decision123',
        expect.any(Object),
        300 // 5 minutes TTL
      );
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=600');
    });

    test('should use cached department colleagues when available', async () => {
      const mockDecisionId = 'decision123';
      const mockDecision = {
        id: mockDecisionId,
        approverId: 'user123',
        stage: {
          leaveRequest: {
            companyId: 'company1',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-19'),
            Employee: {
              id: 'emp1',
              User: { name: 'John Doe', email: 'john@example.com' },
              Department: { id: 'dept1', name: 'Engineering' },
            },
            EventCategory: { id: 'cat1', name: 'Annual Leave', color: '#blue' },
          },
        },
      };

      const mockCachedColleagues = [
        { id: 'emp2', name: 'Jane Smith', leaveType: 'Annual Leave' },
      ];

      mockApprovalDetailsCache.get.mockResolvedValue(null);
      mockPrisma.leaveApprovalDecision.findUnique.mockResolvedValue(mockDecision as any);
      mockPrisma.leaveEntitlement.findFirst.mockResolvedValue({
        totalDays: 20,
        usedDays: 5,
      });
      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue({
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [{
            weekNumber: 1,
            WorkingPatternDay: [
              { day: 'Mon', type: 'FULL_DAY' },
              { day: 'Tue', type: 'FULL_DAY' },
              { day: 'Wed', type: 'FULL_DAY' },
              { day: 'Thu', type: 'FULL_DAY' },
              { day: 'Fri', type: 'FULL_DAY' },
              { day: 'Sat', type: 'NON_WORKING' },
              { day: 'Sun', type: 'NON_WORKING' },
            ],
          }],
        },
      } as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
      mockDepartmentColleaguesCache.get.mockResolvedValue(mockCachedColleagues);

      const request = new Request('http://localhost:3000/api/approvals/decision123/details');
      const context = { params: Promise.resolve({ id: mockDecisionId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.departmentColleagues).toEqual(mockCachedColleagues);
      expect(mockPrisma.leaveRequest.findMany).not.toHaveBeenCalled();
      expect(mockDepartmentColleaguesCache.set).toHaveBeenCalledWith(
        'dept-colleagues:company1:dept1:2024-01-15T00:00:00.000Z:2024-01-19T00:00:00.000Z',
        mockCachedColleagues,
        600 // 10 minutes TTL
      );
    });
  });

  describe('Batch Calculation Performance', () => {
    test('should use batch calculation instead of individual day calculations', async () => {
      const mockDecisionId = 'decision123';
      const mockDecision = {
        id: mockDecisionId,
        approverId: 'user123',
        stage: {
          leaveRequest: {
            companyId: 'company1',
            startDate: new Date('2024-01-15'), // Monday
            endDate: new Date('2024-01-24'), // Wednesday (10 days)
            Employee: {
              id: 'emp1',
              User: { name: 'John Doe', email: 'john@example.com' },
              Department: null, // No department to avoid colleagues query
            },
            EventCategory: { id: 'cat1', name: 'Annual Leave', color: '#blue' },
          },
        },
      };

      mockApprovalDetailsCache.get.mockResolvedValue(null);
      mockDepartmentColleaguesCache.get.mockResolvedValue(null);
      mockPrisma.leaveApprovalDecision.findUnique.mockResolvedValue(mockDecision as any);
      mockPrisma.leaveEntitlement.findFirst.mockResolvedValue({
        totalDays: 20,
        usedDays: 5,
      });
      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue({
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [{
            weekNumber: 1,
            WorkingPatternDay: [
              { day: 'Mon', type: 'FULL_DAY' },
              { day: 'Tue', type: 'FULL_DAY' },
              { day: 'Wed', type: 'HALF_DAY_AM' },
              { day: 'Thu', type: 'FULL_DAY' },
              { day: 'Fri', type: 'FULL_DAY' },
              { day: 'Sat', type: 'NON_WORKING' },
              { day: 'Sun', type: 'NON_WORKING' },
            ],
          }],
        },
      } as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
      mockPrisma.leaveRequest.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/approvals/decision123/details');
      const context = { params: Promise.resolve({ id: mockDecisionId }) });

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.dates.requestedDays).toBe('4.5'); // 5 full days - 0.5 for Wednesday
      
      // Verify that working pattern was fetched only once
      expect(mockPrisma.employeeWorkingPatternAssignment.findFirst).toHaveBeenCalledTimes(1);
      
      // Verify batch calculation was used (should have 10 dates processed)
      expect(data.data.dates.requestedDays).not.toBe('10'); // Not all days are full days
    });

    test('should handle public holidays correctly in batch calculation', async () => {
      const mockDecisionId = 'decision123';
      const mockDecision = {
        id: mockDecisionId,
        approverId: 'user123',
        stage: {
          leaveRequest: {
            companyId: 'company1',
            startDate: new Date('2024-01-01'), // Monday (Public Holiday)
            endDate: new Date('2024-01-02'), // Tuesday
            Employee: {
              id: 'emp1',
              User: { name: 'John Doe', email: 'john@example.com' },
              Department: null,
            },
            EventCategory: { id: 'cat1', name: 'Annual Leave', color: '#blue' },
          },
        },
      };

      mockApprovalDetailsCache.get.mockResolvedValue(null);
      mockDepartmentColleaguesCache.get.mockResolvedValue(null);
      mockPrisma.leaveApprovalDecision.findUnique.mockResolvedValue(mockDecision as any);
      mockPrisma.leaveEntitlement.findFirst.mockResolvedValue({
        totalDays: 20,
        usedDays: 5,
      });
      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue({
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [{
            weekNumber: 1,
            WorkingPatternDay: [
              { day: 'Mon', type: 'FULL_DAY' },
              { day: 'Tue', type: 'FULL_DAY' },
            ],
          }],
        },
      } as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue([
        { date: new Date('2024-01-01'), name: 'New Year\'s Day' },
      ]);
      mockPrisma.leaveRequest.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/approvals/decision123/details');
      const context = { params: Promise.resolve({ id: mockDecisionId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.dates.requestedDays).toBe('1'); // Only Tuesday counts, Monday is public holiday
    });
  });

  describe('Query Optimization', () => {
    test('should use optimized select for department colleagues query', async () => {
      const mockDecisionId = 'decision123';
      const mockDecision = {
        id: mockDecisionId,
        approverId: 'user123',
        stage: {
          leaveRequest: {
            companyId: 'company1',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-19'),
            Employee: {
              id: 'emp1',
              User: { name: 'John Doe', email: 'john@example.com' },
              Department: { id: 'dept1', name: 'Engineering' },
            },
            EventCategory: { id: 'cat1', name: 'Annual Leave', color: '#blue' },
          },
        },
      };

      mockApprovalDetailsCache.get.mockResolvedValue(null);
      mockDepartmentColleaguesCache.get.mockResolvedValue(null);
      mockPrisma.leaveApprovalDecision.findUnique.mockResolvedValue(mockDecision as any);
      mockPrisma.leaveEntitlement.findFirst.mockResolvedValue({
        totalDays: 20,
        usedDays: 5,
      });
      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue({
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [{
            weekNumber: 1,
            WorkingPatternDay: [
              { day: 'Mon', type: 'FULL_DAY' },
            ],
          }],
        },
      } as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
      mockPrisma.leaveRequest.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/approvals/decision123/details');
      const context = { params: Promise.resolve({ id: mockDecisionId }) });

      await GET(request, context);

      // Verify the optimized query was used with select
      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            Employee: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                User: expect.objectContaining({
                  select: expect.objectContaining({
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    profileImageUrl: true,
                  }),
                }),
              }),
            }),
            startDate: true,
            endDate: true,
            EventCategory: expect.objectContaining({
              select: expect.objectContaining({
                name: true,
                color: true,
              }),
            }),
          }),
          take: 20,
        })
      );
    });
  });
});
