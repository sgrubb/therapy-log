import { useState } from "react";
import { Dialog } from "radix-ui";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@shared/types/csv";

interface ColumnDef {
  name: string;
  required: boolean;
  description: string;
}

interface Props {
  title: string;
  columns: ColumnDef[];
  requiredHeaders: readonly string[];
  onImport: () => Promise<ImportResult | null>;
  onSuccess: () => void;
  templateHeaders: readonly string[];
}

export function CsvImportDialog({
  title,
  columns,
  onImport,
  onSuccess,
  templateHeaders,
}: Props) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [columnRefOpen, setColumnRefOpen] = useState(false);

  function handleOpen() {
    setResult(null);
    setColumnRefOpen(false);
    setOpen(true);
  }

  function handleDismiss() {
    if (!importing) {
      setOpen(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const res = await onImport();
      if (res === null) {
        setOpen(false);
        return;
      }
      setResult(res);
      if (res.errors.length === 0) {
        onSuccess();
      }
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = templateHeaders.join(",");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const succeeded = result !== null && result.errors.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { handleDismiss(); } }}>
      <Dialog.Trigger asChild>
        <Button variant="outline" onClick={handleOpen}>Import</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Select a CSV file to import. All rows must be valid — if any row has an error,
            no records will be inserted.
          </Dialog.Description>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-sm"
            onClick={() => setColumnRefOpen((v) => !v)}
          >
            {columnRefOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
            Column reference
          </button>

          {columnRefOpen && (
            <div className="rounded-md border text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">Column</th>
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">Required</th>
                    <th className="text-muted-foreground px-3 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col.name} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{col.name}</td>
                      <td className="px-3 py-2">{col.required ? "Yes" : "No"}</td>
                      <td className="text-muted-foreground px-3 py-2">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {succeeded && (
            <p className="text-sm text-green-700">
              Successfully imported {result.inserted} {result.inserted === 1 ? "record" : "records"}.
            </p>
          )}

          {result !== null && result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-destructive text-sm font-medium">
                Import failed — {result.errors.length} {result.errors.length === 1 ? "error" : "errors"} found.
                No records were inserted.
              </p>
              <ul className="text-destructive max-h-48 overflow-y-auto text-sm">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    {e.row > 0 ? `Row ${e.row}: ` : ""}{e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            {!succeeded && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing…" : "Select File"}
              </Button>
            )}
            <Button variant="outline" onClick={downloadTemplate} disabled={importing}>
              Download Template
            </Button>
            <Dialog.Close asChild>
              <Button variant="outline" disabled={importing} onClick={handleDismiss}>
                {succeeded ? "Close" : "Cancel"}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
