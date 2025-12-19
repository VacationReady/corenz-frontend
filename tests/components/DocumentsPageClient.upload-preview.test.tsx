/**
 * Regression tests for DocumentsPageClient upload preview modal
 * Ensures iframe load clears spinner and prevents false timeout error.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DocumentsPageClient from "@/app/components/documents/DocumentsPageClient";

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

// Mock fetch used by DocumentsPageClient
global.fetch = jest.fn();

const mockDocuments: any[] = [];

describe("DocumentsPageClient - Upload Preview Modal", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // URL without auto-open
    delete (window as any).location;
    (window as any).location = new URL("http://localhost/documents");

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/documents/list")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDocuments) });
      }
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: "user-1", role: "ADMIN", companyId: "company-1" } }),
        });
      }
      if (url.includes("/api/departments/active")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes("/api/job-roles/active")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes("/api/companies/")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: "Test Company" }) });
      }
      if (url.includes("/api/document-categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ categories: ["Policies"] }) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
  });

  test("iframe load clears spinner and prevents timeout error", async () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");

    const createObjectURLSpy = jest
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:preview-url" as any);
    const revokeObjectURLSpy = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    render(<DocumentsPageClient />);

    // open upload modal
    fireEvent.click(await screen.findByRole("button", { name: /upload document/i }));

    // attach a file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(["dummy"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // open preview modal
    fireEvent.click(await screen.findByRole("button", { name: /preview/i }));

    // spinner shown
    expect(await screen.findByText(/loading preview/i)).toBeInTheDocument();

    // simulate iframe load
    const iframe = (await screen.findByTitle("Preview")) as HTMLIFrameElement;
    fireEvent.load(iframe);

    // spinner cleared
    await waitFor(() => {
      expect(screen.queryByText(/loading preview/i)).not.toBeInTheDocument();
    });

    // ensure the timeout was cleared so it can't fire later
    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(screen.queryByText(/preview is taking too long to load/i)).not.toBeInTheDocument();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  test("iframe error shows failure message and stops spinner", async () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");

    jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview-url" as any);
    jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    render(<DocumentsPageClient />);

    fireEvent.click(await screen.findByRole("button", { name: /upload document/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(await screen.findByRole("button", { name: /preview/i }));

    const iframe = (await screen.findByTitle("Preview")) as HTMLIFrameElement;
    fireEvent.error(iframe);

    await waitFor(() => {
      expect(screen.queryByText(/loading preview/i)).not.toBeInTheDocument();
      expect(screen.getByText(/failed to load preview/i)).toBeInTheDocument();
    });

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
