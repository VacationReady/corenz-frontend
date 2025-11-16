import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import AddEmployeeModal from '@/app/components/employees/AddEmployeeModal';

// Mock session
const mockSession = {
  user: {
    id: 'test-user-123',
    companyId: 'test-company-456',
    email: 'test@example.com',
  },
  expires: '2099-12-31',
};

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('AddEmployeeModal - WCAG Accessibility', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;
  });

  it('should have proper label associations for all inputs', () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    // Check that all required inputs have labels with htmlFor
    const firstNameLabel = screen.getByText('First Name *');
    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    expect(firstNameLabel).toBeInTheDocument();
    expect(firstNameInput).toHaveAttribute('id', 'firstName');

    const lastNameLabel = screen.getByText('Last Name *');
    const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
    expect(lastNameLabel).toBeInTheDocument();
    expect(lastNameInput).toHaveAttribute('id', 'lastName');

    const emailLabel = screen.getByText('Email Address *');
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailLabel).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('id', 'email');

    const phoneLabel = screen.getByText('Phone Number');
    const phoneInput = screen.getByRole('textbox', { name: /phone/i });
    expect(phoneLabel).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute('id', 'phone');
  });

  it('should have aria-describedby for switches', () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const adminSwitch = screen.getByLabelText(/admin access/i);
    expect(adminSwitch).toHaveAttribute('aria-describedby', 'admin-access-description');

    const inviteSwitch = screen.getByLabelText(/send login invite now/i);
    expect(inviteSwitch).toHaveAttribute('aria-describedby', 'send-invite-description');
  });

  it('should have screen reader only descriptions for switches', () => {
    const { container } = render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const adminDescription = container.querySelector('#admin-access-description');
    expect(adminDescription).toHaveClass('sr-only');
    expect(adminDescription).toHaveTextContent(/grant this employee administrative privileges/i);

    const inviteDescription = container.querySelector('#send-invite-description');
    expect(inviteDescription).toHaveClass('sr-only');
    expect(inviteDescription).toHaveTextContent(/send an email invitation/i);
  });

  it('should announce validation errors with role="alert"', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    
    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    await waitFor(() => {
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it('should format phone number to +64 NZ format automatically', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const phoneInput = screen.getByRole('textbox', { name: /phone/i });
    
    // Enter NZ mobile number starting with 0
    fireEvent.change(phoneInput, { target: { value: '021123456' } });
    
    await waitFor(() => {
      expect(phoneInput).toHaveValue('+64211234567');
    });
  });

  it('should have aria-describedby for phone input helper text', () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const phoneInput = screen.getByRole('textbox', { name: /phone/i });
    expect(phoneInput).toHaveAttribute('aria-describedby', 'phone-help');

    const helperText = screen.getByText(/automatically formats to \+64/i);
    expect(helperText).toHaveAttribute('id', 'phone-help');
  });
});

describe('AddEmployeeModal - Autosave & Draft Management', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;
  });

  it('should autosave form data to sessionStorage when changes are made', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    
    // Wait for debounced autosave (1 second)
    await waitFor(() => {
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('addEmployeeModal_draft_'),
        expect.stringContaining('"firstName":"John"')
      );
    }, { timeout: 1500 });
  });

  it('should restore draft from sessionStorage when modal reopens', () => {
    const draftData = JSON.stringify({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+64211234567',
      dateOfBirth: '',
      startDate: '',
      role: 'EMPLOYEE',
    });

    mockSessionStorage.setItem(
      'addEmployeeModal_draft_test-company-456_test-user-123',
      draftData
    );

    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    expect(firstNameInput).toHaveValue('Jane');

    const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
    expect(lastNameInput).toHaveValue('Doe');
  });

  it('should show discard confirmation dialog when closing with unsaved changes', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    // Make a change
    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    fireEvent.change(firstNameInput, { target: { value: 'John' } });

    // Try to close the modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Should show discard confirmation
    await waitFor(() => {
      expect(screen.getByText(/discard unsaved changes/i)).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should allow continuing editing from discard dialog', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    // Make a change
    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    fireEvent.change(firstNameInput, { target: { value: 'John' } });

    // Try to close
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText(/discard unsaved changes/i)).toBeInTheDocument();
    });

    // Click continue editing
    const continueButton = screen.getByRole('button', { name: /continue editing/i });
    fireEvent.click(continueButton);

    // Dialog should close, modal should remain open
    await waitFor(() => {
      expect(screen.queryByText(/discard unsaved changes/i)).not.toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(firstNameInput).toHaveValue('John');
  });

  it('should clear draft and close modal when confirming discard', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    // Make a change
    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    fireEvent.change(firstNameInput, { target: { value: 'John' } });

    // Try to close
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText(/discard unsaved changes/i)).toBeInTheDocument();
    });

    // Click discard
    const discardButton = screen.getByRole('button', { name: /discard changes/i });
    fireEvent.click(discardButton);

    // Should remove draft and close
    await waitFor(() => {
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        expect.stringContaining('addEmployeeModal_draft_')
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should clear draft from sessionStorage on successful submission', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '123', firstName: 'John', lastName: 'Doe' }),
      })
    ) as jest.Mock;

    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    // Fill in required fields
    fireEvent.change(screen.getByRole('textbox', { name: /first name/i }), { target: { value: 'John' } });
    fireEvent.change(screen.getByRole('textbox', { name: /last name/i }), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'john@example.com' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        expect.stringContaining('addEmployeeModal_draft_')
      );
    });
  });
});

describe('AddEmployeeModal - Keyboard Navigation & Focus Order', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;
  });

  it('should have logical tab order through form fields', () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const phoneInput = screen.getByRole('textbox', { name: /phone/i });

    // Tab through inputs
    firstNameInput.focus();
    expect(document.activeElement).toBe(firstNameInput);

    fireEvent.keyDown(firstNameInput, { key: 'Tab' });
    expect(document.activeElement).toBe(lastNameInput);

    fireEvent.keyDown(lastNameInput, { key: 'Tab' });
    expect(document.activeElement).toBe(emailInput);

    fireEvent.keyDown(emailInput, { key: 'Tab' });
    expect(document.activeElement).toBe(phoneInput);
  });

  it('should handle form submission via Enter key', async () => {
    render(
      <SessionProvider session={mockSession}>
        <AddEmployeeModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </SessionProvider>
    );

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.keyDown(firstNameInput, { key: 'Enter', code: 'Enter' });

    // Form should attempt validation
    await waitFor(() => {
      expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
    });
  });
});
