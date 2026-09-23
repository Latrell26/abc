import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditForm } from "../components/audit-form";
import { useRouter } from "next/navigation";

describe("AuditForm component", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushMock = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: pushMock, replace: vi.fn(), back: vi.fn() });
  });

  test("shows error for empty input", async () => {
    render(<AuditForm />);

    await userEvent.click(screen.getByRole("button", { name: /Run audit/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Please enter a website URL/i);
    });
  });

  test("shows error for invalid URL format", async () => {
    render(<AuditForm />);

    const input = screen.getByRole("textbox", { name: /Website URL to audit/i });
    await userEvent.type(input, "not-a-url");
    await userEvent.click(screen.getByRole("button", { name: /Run audit/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/doesn't look like a valid URL/i);
    });
  });

  test("submits valid URL and navigates to loading page", async () => {
    render(<AuditForm />);

    const input = screen.getByRole("textbox", { name: /Website URL to audit/i });
    await userEvent.type(input, "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: /Run audit/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/audit/loading?url=https%3A%2F%2Fexample.com");
    });
  });

  test("submits bare domain and navigates to loading page", async () => {
    render(<AuditForm />);

    const input = screen.getByRole("textbox", { name: /Website URL to audit/i });
    await userEvent.type(input, "example.com");
    await userEvent.click(screen.getByRole("button", { name: /Run audit/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/audit/loading?url=example.com");
    });
  });

  test("clears error when user starts typing again", async () => {
    render(<AuditForm />);

    await userEvent.click(screen.getByRole("button", { name: /Run audit/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const input = screen.getByRole("textbox", { name: /Website URL to audit/i });
    await userEvent.type(input, "https://example.com");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});