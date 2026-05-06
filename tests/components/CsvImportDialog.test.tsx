import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import type { ImportResult } from "@shared/types/csv";

const columns = [
  { name: "first_name", required: true, description: "First name" },
  { name: "last_name", required: true, description: "Last name" },
  { name: "notes", required: false, description: "Optional notes" },
];

function renderDialog(overrides?: {
  onImport?: () => Promise<ImportResult | null>;
  onDownloadTemplate?: () => Promise<{ path: string } | null>;
  onSuccess?: () => void;
}) {
  const onImport = overrides?.onImport ?? vi.fn().mockResolvedValue(null);
  const onDownloadTemplate = overrides?.onDownloadTemplate ?? vi.fn().mockResolvedValue(null);
  const onSuccess = overrides?.onSuccess ?? vi.fn();

  render(
    <CsvImportDialog
      title="Import Therapists"
      columns={columns}
      onImport={onImport}
      onSuccess={onSuccess}
      onDownloadTemplate={onDownloadTemplate}
    />,
  );

  return { onImport, onDownloadTemplate, onSuccess };
}

async function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /^import$/i }));
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Opening and closing ──────────────────────────────────────────────────────

describe("CsvImportDialog — open / close", () => {
  it("opens the dialog when the Import trigger is clicked", async () => {
    renderDialog();
    await openDialog();
    expect(screen.getByRole("heading", { name: /import therapists/i })).toBeInTheDocument();
  });

  it("closes the dialog when Cancel is clicked", async () => {
    renderDialog();
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("resets result state when re-opened after a previous import", async () => {
    const onImport = vi.fn().mockResolvedValueOnce({ inserted: 2, errors: [] });
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));
    await waitFor(() => screen.getByRole("status"));

    // Close via the "Close" button that replaces "Cancel" after success
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Re-open — should see "Select File" again, not the success message
    await openDialog();
    expect(screen.getByRole("button", { name: /select file/i })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

// ── Import success ───────────────────────────────────────────────────────────

describe("CsvImportDialog — import success", () => {
  it("shows success message with inserted count after successful import", async () => {
    const onImport = vi.fn().mockResolvedValue({ inserted: 3, errors: [] });
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /successfully imported 3 records/i,
      );
    });
  });

  it("uses singular 'record' for a single insertion", async () => {
    const onImport = vi.fn().mockResolvedValue({ inserted: 1, errors: [] });
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/1 record\./i);
    });
  });

  it("calls onSuccess after a successful import", async () => {
    const onSuccess = vi.fn();
    const onImport = vi.fn().mockResolvedValue({ inserted: 1, errors: [] });
    renderDialog({ onImport, onSuccess });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("hides the Select File button and shows Close button after success", async () => {
    const onImport = vi.fn().mockResolvedValue({ inserted: 1, errors: [] });
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /select file/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument();
    });
  });
});

// ── Import errors ────────────────────────────────────────────────────────────

describe("CsvImportDialog — import errors", () => {
  it("shows error alert with row-level messages on import failure", async () => {
    const onImport = vi.fn().mockResolvedValue({
      inserted: 0,
      errors: [
        { row: 2, message: '"first_name" is required' },
        { row: 3, message: '"start_date" must be in YYYY-MM-DD format' },
      ],
    });
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/2 errors/i);
      expect(alert).toHaveTextContent(/row 2/i);
      expect(alert).toHaveTextContent('"first_name" is required');
    });
  });

  it("does not call onSuccess when there are errors", async () => {
    const onSuccess = vi.fn();
    const onImport = vi.fn().mockResolvedValue({
      inserted: 0,
      errors: [{ row: 2, message: "error" }],
    });
    renderDialog({ onImport, onSuccess });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => screen.getByRole("alert"));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("still shows the Select File button after an error so the user can retry", async () => {
    const onImport = vi.fn().mockResolvedValue({
      inserted: 0,
      errors: [{ row: 2, message: "error" }],
    });
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => screen.getByRole("alert"));
    expect(screen.getByRole("button", { name: /select file/i })).toBeInTheDocument();
  });

  it("shows a generic error message when onImport throws", async () => {
    const onImport = vi.fn().mockRejectedValue(new Error("disk full"));
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/import failed/i);
    });
  });
});

// ── Import canceled (returns null) ───────────────────────────────────────────

describe("CsvImportDialog — import canceled", () => {
  it("closes the dialog when onImport returns null (file picker dismissed)", async () => {
    const onImport = vi.fn().mockResolvedValue(null);
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

// ── Template download ────────────────────────────────────────────────────────

describe("CsvImportDialog — download template", () => {
  it("calls onDownloadTemplate when Download Template is clicked", async () => {
    const onDownloadTemplate = vi.fn().mockResolvedValue({ path: "/tmp/t.csv" });
    renderDialog({ onDownloadTemplate });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /download template/i }));

    await waitFor(() => expect(onDownloadTemplate).toHaveBeenCalledOnce());
  });

  it("shows a separate template error alert when download throws", async () => {
    const onDownloadTemplate = vi.fn().mockRejectedValue(new Error("permission denied"));
    renderDialog({ onDownloadTemplate });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /download template/i }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((a) => a.textContent?.match(/could not save template/i))).toBe(true);
    });
  });

  it("template error does not affect import result state", async () => {
    const onDownloadTemplate = vi.fn().mockRejectedValue(new Error("fail"));
    renderDialog({ onDownloadTemplate });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /download template/i }));

    await waitFor(() => screen.getAllByRole("alert"));
    // Import section is unaffected — no "0 records inserted" message
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/no records were inserted/i)).not.toBeInTheDocument();
  });
});

// ── Column reference toggle ──────────────────────────────────────────────────

describe("CsvImportDialog — column reference", () => {
  it("hides the column table by default", async () => {
    renderDialog();
    await openDialog();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the column table when the toggle is clicked", async () => {
    renderDialog();
    await openDialog();

    fireEvent.click(screen.getByText(/column reference/i));

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  it("shows all provided columns in the table", async () => {
    renderDialog();
    await openDialog();

    fireEvent.click(screen.getByText(/column reference/i));

    await waitFor(() => {
      expect(screen.getByText("first_name")).toBeInTheDocument();
      expect(screen.getByText("last_name")).toBeInTheDocument();
      expect(screen.getByText("notes")).toBeInTheDocument();
    });
  });

  it("hides the table when the toggle is clicked again", async () => {
    renderDialog();
    await openDialog();

    fireEvent.click(screen.getByText(/column reference/i));
    await waitFor(() => screen.getByRole("table"));

    fireEvent.click(screen.getByText(/column reference/i));

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});

// ── Busy state ───────────────────────────────────────────────────────────────

describe("CsvImportDialog — busy state", () => {
  it("disables all buttons while importing", async () => {
    let resolveImport!: (v: ImportResult) => void;
    const onImport = vi.fn().mockReturnValue(
      new Promise<ImportResult>((res) => { resolveImport = res; }),
    );
    renderDialog({ onImport });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /select file/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /importing/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /download template/i })).toBeDisabled();
    });

    resolveImport({ inserted: 0, errors: [] });
  });
});
