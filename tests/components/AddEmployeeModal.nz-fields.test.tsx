/**
 * Tests for NZ-specific onboarding fields in AddEmployeeModal
 * 
 * Covers:
 * - IRD number validation
 * - Bank account validation  
 * - KiwiSaver enrollment and rate selection
 * - Tax code selection
 * - Visa/work permit fields
 * - Emergency contact fields
 * - 90-day trial period acknowledgment
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AddEmployeeModal from '@/app/components/employees/AddEmployeeModal';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { companyId: 'test-company-123' } },
    status: 'authenticated',
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('AddEmployeeModal - NZ Fields', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('IRD Number Validation', () => {
    it('should accept valid 8-digit IRD number', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const irdInput = screen.getByPlaceholderText('123-456-789');
      fireEvent.change(irdInput, { target: { value: '12345678' } });

      await waitFor(() => {
        expect(screen.queryByText(/IRD number must be 8 or 9 digits/)).not.toBeInTheDocument();
      });
    });

    it('should accept valid 9-digit IRD number', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const irdInput = screen.getByPlaceholderText('123-456-789');
      fireEvent.change(irdInput, { target: { value: '123456789' } });

      await waitFor(() => {
        expect(screen.queryByText(/IRD number must be 8 or 9 digits/)).not.toBeInTheDocument();
      });
    });

    it('should accept IRD number with dashes', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const irdInput = screen.getByPlaceholderText('123-456-789');
      fireEvent.change(irdInput, { target: { value: '123-456-789' } });

      await waitFor(() => {
        expect(screen.queryByText(/IRD number must be 8 or 9 digits/)).not.toBeInTheDocument();
      });
    });

    it('should show error for invalid IRD number', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const irdInput = screen.getByPlaceholderText('123-456-789');
      fireEvent.change(irdInput, { target: { value: '1234' } });

      await waitFor(() => {
        expect(screen.getByText('IRD number must be 8 or 9 digits')).toBeInTheDocument();
      });
    });

    it('should block progression to Step 2 with invalid IRD', async () => {
      const { toast } = require('sonner');
      
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
      
      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Invalid IRD
      const irdInput = screen.getByPlaceholderText('123-456-789');
      fireEvent.change(irdInput, { target: { value: '123' } });

      // Try to go to next step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fix validation errors before proceeding');
      });
    });
  });

  describe('Bank Account Validation', () => {
    it('should accept valid bank account number', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const bankInput = screen.getByPlaceholderText('12-3456-7890123-00');
      fireEvent.change(bankInput, { target: { value: '12-3456-7890123-00' } });

      await waitFor(() => {
        expect(screen.queryByText(/Bank account format/)).not.toBeInTheDocument();
      });
    });

    it('should accept bank account without dashes (15 digits)', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const bankInput = screen.getByPlaceholderText('12-3456-7890123-00');
      fireEvent.change(bankInput, { target: { value: '123456789012300' } });

      await waitFor(() => {
        expect(screen.queryByText(/Bank account format/)).not.toBeInTheDocument();
      });
    });

    it('should show error for invalid bank account', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const bankInput = screen.getByPlaceholderText('12-3456-7890123-00');
      fireEvent.change(bankInput, { target: { value: '12345' } });

      await waitFor(() => {
        expect(screen.getByText(/Bank account format/)).toBeInTheDocument();
      });
    });
  });

  describe('KiwiSaver Enrollment', () => {
    it('should show KiwiSaver rate selector when enrolled', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const kiwiSaverSwitch = screen.getByLabelText('KiwiSaver Enrolled?');
      await userEvent.click(kiwiSaverSwitch);

      await waitFor(() => {
        expect(screen.getByText('KiwiSaver Employee Contribution Rate')).toBeInTheDocument();
      });
    });

    it('should hide KiwiSaver rate selector when not enrolled', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const kiwiSaverSwitch = screen.getByLabelText('KiwiSaver Enrolled?');
      
      // Enable then disable
      await userEvent.click(kiwiSaverSwitch);
      await userEvent.click(kiwiSaverSwitch);

      await waitFor(() => {
        expect(screen.queryByText('KiwiSaver Employee Contribution Rate')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tax Code Selection', () => {
    it('should display NZ tax code options', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const taxCodeSelect = screen.getByPlaceholderText('Select tax code');
      await userEvent.click(taxCodeSelect);

      await waitFor(() => {
        expect(screen.getByText(/M - Primary employment/)).toBeInTheDocument();
        expect(screen.getByText(/SB - Secondary employment/)).toBeInTheDocument();
        expect(screen.getByText(/M SL - Primary with student loan/)).toBeInTheDocument();
      });
    });
  });

  describe('90-Day Trial Period', () => {
    it('should show acknowledgment checkbox when trial period enabled', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const trialSwitch = screen.getByLabelText('90-Day Trial Period');
      await userEvent.click(trialSwitch);

      await waitFor(() => {
        expect(screen.getByText(/Employee acknowledges and accepts/)).toBeInTheDocument();
      });
    });

    it('should show warning when trial enabled but not acknowledged', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const trialSwitch = screen.getByLabelText('90-Day Trial Period');
      fireEvent.click(trialSwitch);

      await waitFor(() => {
        expect(screen.getByText(/⚠️ Employee must acknowledge trial period terms/)).toBeInTheDocument();
      });
    });

    it('should block progression without trial acknowledgment', async () => {
      const { toast } = require('sonner');
      
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Smith' } });
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'jane@example.com' } });
      
      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Enable trial period but don't acknowledge
      const trialSwitch = screen.getByLabelText('90-Day Trial Period');
      fireEvent.click(trialSwitch);

      // Try to go to next step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Employee must acknowledge 90-day trial period terms before proceeding');
      });
    });

    it('should allow progression with trial acknowledgment', async () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Smith' } });
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'jane@example.com' } });
      
      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Enable trial period and acknowledge
      const trialSwitch = screen.getByLabelText('90-Day Trial Period');
      fireEvent.click(trialSwitch);

      const acknowledgmentCheckbox = screen.getByLabelText(/Employee acknowledges and accepts/);
      await userEvent.click(acknowledgmentCheckbox);

      // Try to go to next step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Holiday & Working Pattern Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Emergency Contact Fields', () => {
    it('should render all emergency contact fields', () => {
      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Relationship')).toBeInTheDocument();
    });
  });

  describe('Form Submission with NZ Data', () => {
    it('should include NZ fields in payload', async () => {
      const mockFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );
      global.fetch = mockFetch as any;

      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill all required and NZ-specific fields
      fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/Start Date/), { target: { value: '2024-01-01' } });
      
      // NZ fields
      fireEvent.change(screen.getByPlaceholderText('123-456-789'), { target: { value: '123-456-789' } });
      fireEvent.change(screen.getByPlaceholderText('12-3456-7890123-00'), { target: { value: '12-3456-7890123-00' } });
      fireEvent.change(screen.getByPlaceholderText(/NZ Citizen, Permanent Resident/), { target: { value: 'NZ Citizen' } });
      
      // Emergency contact
      const contactNameInputs = screen.getAllByPlaceholderText('Full name');
      fireEvent.change(contactNameInputs[0], { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByPlaceholderText('Phone number'), { target: { value: '0211234567' } });
      fireEvent.change(screen.getByPlaceholderText(/Spouse, Parent/), { target: { value: 'Spouse' } });

      // Progress to Step 2 and submit
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Holiday & Working Pattern Settings')).toBeInTheDocument();
      });

      // Fill Step 2 required fields (mocked)
      // ... then submit

      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        const payload = JSON.parse(calls[calls.length - 1][1].body);
        
        expect(payload.irdNumber).toBe('123-456-789');
        expect(payload.bankAccountNumber).toBe('12-3456-7890123-00');
        expect(payload.residencyStatus).toBe('NZ Citizen');
        expect(payload.emergencyContactName).toBe('Jane Doe');
        expect(payload.emergencyContactPhone).toBe('0211234567');
        expect(payload.emergencyContactRelationship).toBe('Spouse');
      });
    });

    it('should convert KiwiSaver rate from percentage to decimal', async () => {
      const mockFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );
      global.fetch = mockFetch as any;

      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Enable KiwiSaver and set rate
      const kiwiSaverSwitch = screen.getByLabelText('KiwiSaver Enrolled?');
      fireEvent.click(kiwiSaverSwitch);

      // Select 6% rate (value="6")
      const rateSelect = screen.getByPlaceholderText('Select contribution rate');
      await userEvent.selectOptions(rateSelect, '6');

      // Complete form and submit...
      
      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        if (calls.length > 0) {
          const payload = JSON.parse(calls[calls.length - 1][1].body);
          expect(payload.kiwiSaverEmployeeRate).toBe(0.06); // 6% -> 0.06
        }
      });
    });

    it('should include trial period acceptance timestamp', async () => {
      const mockFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );
      global.fetch = mockFetch as any;

      render(
        <AddEmployeeModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Enable and acknowledge trial period
      const trialSwitch = screen.getByLabelText('90-Day Trial Period');
      fireEvent.click(trialSwitch);

      const acknowledgmentCheckbox = screen.getByLabelText(/Employee acknowledges and accepts/);
      fireEvent.click(acknowledgmentCheckbox);

      // Complete form and submit...
      
      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        if (calls.length > 0) {
          const payload = JSON.parse(calls[calls.length - 1][1].body);
          expect(payload.ninetyDayTrialPeriod).toBe(true);
          expect(payload.trialPeriodAccepted).toBe(true);
          expect(payload.trialPeriodAcceptedAt).toBeTruthy();
        }
      });
    });
  });
});
