/**
 * Regression tests for DocumentsPageClient auto-open functionality
 * Tests that /documents?open=<docId> properly opens the preview after documents load
 */

import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import DocumentsPageClient from "@/app/components/documents/DocumentsPageClient";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "ADMIN",
        companyId: "company-1",
      },
    },
    status: "authenticated",
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.history.replaceState
const mockReplaceState = jest.fn();
Object.defineProperty(window, "history", {
  value: { replaceState: mockReplaceState },
  writable: true,
});

const mockDocuments = [
  {
    id: "doc-1",
    name: "Test Document 1",
    category: "Policies",
    path: "path/to/doc1.pdf",
    size: 1024,
    type: "application/pdf",
    createdAt: "2024-01-01T00:00:00Z",
    url: "https://example.com/doc1.pdf",
    canViewAdmin: true,
    canViewManager: true,
    canViewEmployee: true,
    departments: [],
    jobRoles: [],
    requiresAck: false,
  },
  {
    id: "doc-2",
    name: "Test Document 2",
    category: "Handbooks",
    path: "path/to/doc2.pdf",
    size: 2048,
    type: "application/pdf",
    createdAt: "2024-01-02T00:00:00Z",
    url: "https://example.com/doc2.pdf",
    canViewAdmin: true,
    canViewManager: true,
    canViewEmployee: true,
    departments: [],
    jobRoles: [],
    requiresAck: true,
  },
];

describe("DocumentsPageClient - Auto-Open Query Param", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplaceState.mockClear();
    
    // Setup default fetch mocks
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/documents/list")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDocuments),
        });
      }
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: {
                id: "user-1",
                role: "ADMIN",
                companyId: "company-1",
              },
            }),
        });
      }
      if (url.includes("/api/departments/active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes("/api/job-roles/active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes("/api/companies/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: "Test Company" }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    delete (window as any).location;
  });

  test("opens preview modal when query param matches a document after load", async () => {
    // Setup URL with open query param
    delete (window as any).location;
    (window as any).location = new URL("http://localhost/documents?open=doc-1");

    const { container } = render(<DocumentsPageClient />);

    // Wait for documents to load
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/documents/list")
        );
      },
      { timeout: 3000 }
    );

    // Wait for modal to open
    await waitFor(
      () => {
        // Check that the preview modal state is set (you may need to adjust based on your modal implementation)
        const modalElement = container.querySelector('[role="dialog"]');
        expect(modalElement).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify query param was cleaned up
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      "",
      expect.stringContaining("/documents")
    );
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      "",
      expect.not.stringContaining("open=")
    );
  });

  test("handles stale document ID gracefully", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Setup URL with non-existent document ID
    delete (window as any).location;
    (window as any).location = new URL(
      "http://localhost/documents?open=non-existent-id"
    );

    render(<DocumentsPageClient />);

    // Wait for documents to load
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/documents/list")
        );
      },
      { timeout: 3000 }
    );

    // Wait for warning to be logged
    await waitFor(
      () => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Document with ID non-existent-id not found")
        );
      },
      { timeout: 3000 }
    );

    // Verify query param was cleaned up even for stale ID
    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalledWith(
        {},
        "",
        expect.not.stringContaining("open=")
      );
    });

    consoleWarnSpy.mockRestore();
  });

  test("does not open modal without query param", async () => {
    // Setup URL without open query param
    delete (window as any).location;
    (window as any).location = new URL("http://localhost/documents");

    const { container } = render(<DocumentsPageClient />);

    // Wait for documents to load
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/documents/list")
        );
      },
      { timeout: 3000 }
    );

    // Verify no modal is opened
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    const modalElement = container.querySelector('[role="dialog"]');
    expect(modalElement).not.toBeInTheDocument();

    // Verify replaceState was not called
    expect(mockReplaceState).not.toHaveBeenCalled();
  });

  test("works after hard refresh with query param", async () => {
    // Simulate hard refresh scenario
    delete (window as any).location;
    (window as any).location = new URL("http://localhost/documents?open=doc-2");

    const { container } = render(<DocumentsPageClient />);

    // Wait for documents to load
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/documents/list")
        );
      },
      { timeout: 3000 }
    );

    // Wait for modal to open with the correct document
    await waitFor(
      () => {
        const modalElement = container.querySelector('[role="dialog"]');
        expect(modalElement).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify the correct document was loaded (doc-2 requires acknowledgement)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/acknowledge/doc-2/me")
      );
    });
  });

  test("does not trigger if documents array is empty", async () => {
    // Mock empty documents response
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/documents/list")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // ... other mocks remain the same
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });

    delete (window as any).location;
    (window as any).location = new URL("http://localhost/documents?open=doc-1");

    const { container } = render(<DocumentsPageClient />);

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/documents/list")
        );
      },
      { timeout: 3000 }
    );

    // Wait a bit to ensure effect doesn't run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    // Modal should not open for empty document list
    const modalElement = container.querySelector('[role="dialog"]');
    expect(modalElement).not.toBeInTheDocument();

    // Query param should not be cleaned up if documents haven't loaded
    // (This could be adjusted based on desired behavior)
  });
});
