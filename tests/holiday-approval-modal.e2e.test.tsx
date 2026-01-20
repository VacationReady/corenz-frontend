// tests/holiday-approval-modal.e2e.test.tsx

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HolidayApprovalModal } from '../components/approvals/HolidayApprovalModal';
import { useApi } from '../app/hooks/useApi';

// Mock the useApi hook
jest.mock('../app/hooks/useApi');
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { companyId: 'company1' } },
    status: 'authenticated',
  }),
}));

const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('HolidayApprovalModal Performance', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Loading Performance', () => {
    test('should show loading state immediately while fetching data', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'decision123',
          employee: {
            id: 'emp1',
            name: 'John Doe',
            email: 'john@example.com',
            profileImageUrl: null,
            department: 'Engineering',
          },
          leaveType: {
            id: 'cat1',
            name: 'Annual Leave',
            color: '#3b82f6',
          },
          dates: {
            start: '2024-01-15',
            end: '2024-01-19',
            requestedDays: '5',
          },
          balance: {
            totalDays: '20',
            usedDays: '5',
            remainingDays: '15',
            remainingAfterApproval: '10',
          },
          departmentColleagues: [],
          reason: 'Family vacation',
          dayType: 'FULL_DAY',
        },
      };

      // Simulate slow API response
      mockUseApi.mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
        mutate: jest.fn(),
      });

      const onApprove = jest.fn();
      const onDecline = jest.fn();
      const onOpenChange = jest.fn();

      renderWithQueryClient(
        <HolidayApprovalModal
          decisionId="decision123"
          open={true}
          onOpenChange={onOpenChange}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      // Should show loading state immediately
      expect(screen.getByText('Loading request details...')).toBeInTheDocument();
      expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument();
    });

    test('should render full modal data quickly after API response', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'decision123',
          employee: {
            id: 'emp1',
            name: 'John Doe',
            email: 'john@example.com',
            profileImageUrl: null,
            department: 'Engineering',
          },
          leaveType: {
            id: 'cat1',
            name: 'Annual Leave',
            color: '#3b82f6',
          },
          dates: {
            start: '2024-01-15',
            end: '2024-01-19',
            requestedDays: '5',
          },
          balance: {
            totalDays: '20',
            usedDays: '5',
            remainingDays: '15',
            remainingAfterApproval: '10',
          },
          departmentColleagues: [
            {
              id: 'emp2',
              name: 'Jane Smith',
              profileImageUrl: null,
              startDate: '2024-01-16',
              endDate: '2024-01-17',
              leaveType: 'Sick Leave',
              leaveColor: '#ef4444',
            },
          ],
          reason: 'Family vacation',
          dayType: 'FULL_DAY',
        },
      };

      // Simulate successful API response
      mockUseApi.mockReturnValue({
        data: mockResponse,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const onApprove = jest.fn();
      const onDecline = jest.fn();
      const onOpenChange = jest.fn();

      renderWithQueryClient(
        <HolidayApprovalModal
          decisionId="decision123"
          open={true}
          onOpenChange={onOpenChange}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      // Should render all modal content
      await waitFor(() => {
        expect(screen.getByText('Leave Request')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
        expect(screen.getByText('5 days requested')).toBeInTheDocument();
        expect(screen.getByText('Family vacation')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Sick Leave')).toBeInTheDocument();
      });

      // Balance information should be displayed
      expect(screen.getByText('20')).toBeInTheDocument(); // Total days
      expect(screen.getByText('5')).toBeInTheDocument(); // Used days
      expect(screen.getByText('15')).toBeInTheDocument(); // Current remaining
      expect(screen.getByText('10')).toBeInTheDocument(); // After approval

      // Action buttons should be present
      expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    });
  });

  describe('Caching Behavior', () => {
    test('should use SWR caching for subsequent modal opens', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'decision123',
          employee: { name: 'John Doe', email: 'john@example.com' },
          leaveType: { name: 'Annual Leave' },
          dates: { requestedDays: '5' },
          balance: { totalDays: '20', usedDays: '5', remainingDays: '15' },
          departmentColleagues: [],
          reason: 'Test',
          dayType: 'FULL_DAY',
        },
      };

      mockUseApi.mockReturnValue({
        data: mockResponse,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const onApprove = jest.fn();
      const onDecline = jest.fn();
      const onOpenChange = jest.fn();

      const { rerender } = renderWithQueryClient(
        <HolidayApprovalModal
          decisionId="decision123"
          open={true}
          onOpenChange={onOpenChange}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <HolidayApprovalModal
            decisionId="decision123"
            open={false}
            onOpenChange={onOpenChange}
            onApprove={onApprove}
            onDecline={onDecline}
          />
        </QueryClientProvider>
      );

      // Reopen modal - should use cached data
      rerender(
        <QueryClientProvider client={queryClient}>
          <HolidayApprovalModal
            decisionId="decision123"
            open={true}
            onOpenChange={onOpenChange}
            onApprove={onApprove}
            onDecline={onDecline}
          />
        </QueryClientProvider>
      );

      // Should show data immediately from cache
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify useApi was called with caching options
      expect(mockUseApi).toHaveBeenCalledWith(
        '/api/approvals/decision123/details',
        expect.objectContaining({
          revalidateOnFocus: false,
          dedupingInterval: 300000,
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockUseApi.mockReturnValue({
        data: null,
        error: new Error('API Error'),
        isLoading: false,
        mutate: jest.fn(),
      });

      const onApprove = jest.fn();
      const onDecline = jest.fn();
      const onOpenChange = jest.fn();

      renderWithQueryClient(
        <HolidayApprovalModal
          decisionId="decision123"
          open={true}
          onOpenChange={onOpenChange}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Performance Metrics', () => {
    test('should render within performance budget', async () => {
      const startTime = performance.now();

      const mockResponse = {
        success: true,
        data: {
          id: 'decision123',
          employee: {
            id: 'emp1',
            name: 'John Doe',
            email: 'john@example.com',
            profileImageUrl: null,
            department: 'Engineering',
          },
          leaveType: {
            id: 'cat1',
            name: 'Annual Leave',
            color: '#3b82f6',
          },
          dates: {
            start: '2024-01-15',
            end: '2024-01-19',
            requestedDays: '5',
          },
          balance: {
            totalDays: '20',
            usedDays: '5',
            remainingDays: '15',
            remainingAfterApproval: '10',
          },
          departmentColleagues: Array.from({ length: 20 }, (_, i) => ({
            id: `emp${i + 2}`,
            name: `Colleague ${i + 2}`,
            profileImageUrl: null,
            startDate: '2024-01-16',
            endDate: '2024-01-17',
            leaveType: 'Annual Leave',
            leaveColor: '#3b82f6',
          })),
          reason: 'Family vacation',
          dayType: 'FULL_DAY',
        },
      };

      mockUseApi.mockReturnValue({
        data: mockResponse,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const onApprove = jest.fn();
      const onDecline = jest.fn();
      const onOpenChange = jest.fn();

      renderWithQueryClient(
        <HolidayApprovalModal
          decisionId="decision123"
          open={true}
          onOpenChange={onOpenChange}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms (performance budget)
      expect(renderTime).toBeLessThan(100);
      console.log(`Modal rendered in ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('User Interaction Performance', () => {
    test('should handle approve action quickly', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'decision123',
          employee: { name: 'John Doe', email: 'john@example.com' },
          leaveType: { name: 'Annual Leave' },
          dates: { requestedDays: '5' },
          balance: { totalDays: '20', usedDays: '5', remainingDays: '15' },
          departmentColleagues: [],
          reason: 'Test',
          dayType: 'FULL_DAY',
        },
      };

      mockUseApi.mockReturnValue({
        data: mockResponse,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      });

      const onApprove = jest.fn().mockResolvedValue(undefined);
      const onDecline = jest.fn();
      const onOpenChange = jest.fn();

      renderWithQueryClient(
        <HolidayApprovalModal
          decisionId="decision123"
          open={true}
          onOpenChange={onOpenChange}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
      });

      const approveButton = screen.getByRole('button', { name: /Approve/i });
      
      const startTime = performance.now();
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        expect(onApprove).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const actionTime = endTime - startTime;

      // Action should be handled within 50ms
      expect(actionTime).toBeLessThan(50);
      console.log(`Approve action handled in ${actionTime.toFixed(2)}ms`);
    });
  });
});
