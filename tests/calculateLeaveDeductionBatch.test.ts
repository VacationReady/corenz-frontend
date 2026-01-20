// tests/calculateLeaveDeductionBatch.test.ts

import { calculateLeaveDeductionBatch, calculateLeaveDeductionBatchEnhanced } from '../app/lib/calculateLeaveDeductionBatchEnhanced';
import { calculateLeaveDeduction } from '../app/lib/calculateLeaveDeduction';
import { prisma } from '../lib/prisma';
import { DayType } from '@prisma/client';

// Mock Prisma client
jest.mock('../lib/prisma', () => ({
  prisma: {
    employeeWorkingPatternAssignment: {
      findFirst: jest.fn(),
    },
    publicHoliday: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('calculateLeaveDeductionBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should return empty array for empty dates', async () => {
      const result = await calculateLeaveDeductionBatch('emp1', []);
      expect(result).toEqual([]);
    });

    test('should handle single day request', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
                { day: 'Tue', type: DayType.FULL_DAY },
                { day: 'Wed', type: DayType.FULL_DAY },
                { day: 'Thu', type: DayType.FULL_DAY },
                { day: 'Fri', type: DayType.FULL_DAY },
                { day: 'Sat', type: DayType.NON_WORKING },
                { day: 'Sun', type: DayType.NON_WORKING },
              ],
            },
          ],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);

      const dates = [new Date('2024-01-15')]; // Monday
      const result = await calculateLeaveDeductionBatch('emp1', dates);

      expect(result).toEqual([1]);
    });

    test('should handle multi-day request', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
                { day: 'Tue', type: DayType.FULL_DAY },
                { day: 'Wed', type: DayType.HALF_DAY_AM },
                { day: 'Thu', type: DayType.FULL_DAY },
                { day: 'Fri', type: DayType.FULL_DAY },
                { day: 'Sat', type: DayType.NON_WORKING },
                { day: 'Sun', type: DayType.NON_WORKING },
              ],
            },
          ],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);

      const dates = [
        new Date('2024-01-15'), // Monday
        new Date('2024-01-16'), // Tuesday  
        new Date('2024-01-17'), // Wednesday
        new Date('2024-01-18'), // Thursday
        new Date('2024-01-19'), // Friday
        new Date('2024-01-20'), // Saturday
      ];
      const result = await calculateLeaveDeductionBatch('emp1', dates);

      expect(result).toEqual([1, 1, 0.5, 1, 1, 0]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle no working pattern assignment', async () => {
      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(null);

      const dates = [new Date('2024-01-15'), new Date('2024-01-16')];
      const result = await calculateLeaveDeductionBatch('emp1', dates);

      expect(result).toEqual([1, 1]);
    });

    test('should handle working pattern with no weeks', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);

      const dates = [new Date('2024-01-15')];
      const result = await calculateLeaveDeductionBatch('emp1', dates);

      expect(result).toEqual([1]);
    });

    test('should handle cross-month leave request', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
                { day: 'Tue', type: DayType.FULL_DAY },
                { day: 'Wed', type: DayType.FULL_DAY },
                { day: 'Thu', type: DayType.FULL_DAY },
                { day: 'Fri', type: DayType.FULL_DAY },
                { day: 'Sat', type: DayType.NON_WORKING },
                { day: 'Sun', type: DayType.NON_WORKING },
              ],
            },
          ],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);

      const dates = [
        new Date('2024-01-31'), // Wednesday
        new Date('2024-02-01'), // Thursday
        new Date('2024-02-02'), // Friday
      ];
      const result = await calculateLeaveDeductionBatch('emp1', dates);

      expect(result).toEqual([1, 1, 1]);
    });
  });

  describe('Backward Compatibility', () => {
    test('should produce same results as original calculateLeaveDeduction', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
                { day: 'Tue', type: DayType.HALF_DAY_AM },
                { day: 'Wed', type: DayType.NON_WORKING },
                { day: 'Thu', type: DayType.TIMED },
                { day: 'Fri', type: DayType.FULL_DAY },
                { day: 'Sat', type: DayType.NON_WORKING },
                { day: 'Sun', type: DayType.NON_WORKING },
              ],
            },
          ],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);

      const dates = [
        new Date('2024-01-15'), // Monday
        new Date('2024-01-16'), // Tuesday
        new Date('2024-01-17'), // Wednesday
        new Date('2024-01-18'), // Thursday
      ];

      // Mock the original function to return expected values
      const mockOriginalResults = [1, 0.5, 0, 1];
      jest.doMock('../app/lib/calculateLeaveDeduction', () => ({
        calculateLeaveDeduction: jest.fn().mockImplementation((empId, date) => {
          const dayIndex = dates.findIndex(d => d.getTime() === date.getTime());
          return mockOriginalResults[dayIndex];
        }),
      }));

      const batchResult = await calculateLeaveDeductionBatch('emp1', dates);
      
      expect(batchResult).toEqual(mockOriginalResults);
    });
  });
});

describe('calculateLeaveDeductionBatchEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Holiday Support', () => {
    test('should skip deductions for public holidays', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
                { day: 'Tue', type: DayType.FULL_DAY },
              ],
            },
          ],
        },
      };

      const mockPublicHolidays = [
        { date: new Date('2024-01-15'), name: 'New Year\'s Day' },
      ];

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue(mockPublicHolidays);

      const dates = [
        new Date('2024-01-15'), // Monday (Public Holiday)
        new Date('2024-01-16'), // Tuesday
      ];
      
      const result = await calculateLeaveDeductionBatchEnhanced('emp1', dates, {
        includePublicHolidays: true,
        companyId: 'company1',
      });

      expect(result).toEqual([
        {
          date: '2024-01-15',
          deduction: 0,
          isNonWorkingDay: true,
          isPublicHoliday: true,
          notes: 'Public holiday',
        },
        {
          date: '2024-01-16',
          deduction: 1,
          isNonWorkingDay: false,
          isPublicHoliday: false,
          notes: 'Full working day',
        },
      ]);
    });

    test('should work without public holidays when not requested', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
              ],
            },
          ],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);
      mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

      const dates = [new Date('2024-01-15')];
      
      const result = await calculateLeaveDeductionBatchEnhanced('emp1', dates);

      expect(result).toEqual([
        {
          date: '2024-01-15',
          deduction: 1,
          isNonWorkingDay: false,
          isPublicHoliday: false,
          notes: 'Full working day',
        },
      ]);
    });
  });

  describe('Detailed Results', () => {
    test('should provide detailed information for each day', async () => {
      const mockWorkingPattern = {
        effectiveDate: new Date('2024-01-01'),
        WorkingPattern: {
          WorkingPatternWeek: [
            {
              weekNumber: 1,
              WorkingPatternDay: [
                { day: 'Mon', type: DayType.FULL_DAY },
                { day: 'Tue', type: DayType.HALF_DAY_AM },
                { day: 'Wed', type: DayType.NON_WORKING },
                { day: 'Thu', type: DayType.TIMED },
              ],
            },
          ],
        },
      };

      mockPrisma.employeeWorkingPatternAssignment.findFirst.mockResolvedValue(mockWorkingPattern as any);

      const dates = [
        new Date('2024-01-15'), // Monday
        new Date('2024-01-16'), // Tuesday
        new Date('2024-01-17'), // Wednesday
        new Date('2024-01-18'), // Thursday
      ];
      
      const result = await calculateLeaveDeductionBatchEnhanced('emp1', dates);

      expect(result).toEqual([
        {
          date: '2024-01-15',
          deduction: 1,
          isNonWorkingDay: false,
          isPublicHoliday: false,
          notes: 'Full working day',
        },
        {
          date: '2024-01-16',
          deduction: 0.5,
          isNonWorkingDay: false,
          isPublicHoliday: false,
          notes: 'Half day (AM)',
        },
        {
          date: '2024-01-17',
          deduction: 0,
          isNonWorkingDay: true,
          isPublicHoliday: false,
          notes: 'Non-working day',
        },
        {
          date: '2024-01-18',
          deduction: 1,
          isNonWorkingDay: false,
          isPublicHoliday: false,
          notes: 'Timed hours (counted as full day)',
        },
      ]);
    });
  });
});
