import { useState } from "react";
import { Dialog } from "radix-ui";
import { ChevronDown, ChevronRight, Upload, FolderOpen, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IpcError } from "@/lib/ipc";
import log from "@/lib/logger";
import type { ImportResult } from "@shared/types/csv";

interface ColumnDef {
  name: string;
  required: boolean;
  description: string;
}

interface Props {
  title: string;
  columns: ColumnDef[];
  onImport: () => Promise<ImportResult | null>;
  onSuccess: () => void;
  onDownloadTemplate: () => Promise<{ path: string } | null>;
}

export function CsvImportDialog({
  title,
  columns,
  onImport,
  onSuccess,
  onDownloadTemplate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [columnRefOpen, setColumnRefOpen] = useState(false);
  const busy = importing || downloadingTemplate;

  function handleOpen() {
    setResult(null);
    setTemplateError(null);
    setColumnRefOpen(false);
    setOpen(true);
  }

  function handleDismiss() {
    if (!busy) {
      setOpen(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    setTemplateError(null);
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
    } catch (err) {
      log.error("CSV import failed:", err);
      const message = err instanceof IpcError
        ? err.message
        : "Import failed. Please try again.";
      setResult({ inserted: 0, errors: [{ row: 0, message }] });
    } finally {
      setImporting(false);
    }
  }

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    setTemplateError(null);
    try {
      await onDownloadTemplate();
    } catch (err) {
      log.error("CSV template save failed:", err);
      setTemplateError(
        err instanceof IpcError ? err.message : "Could not save template. Please try again.",
      );
    } finally {
      setDownloadingTemplate(false);
    }
  }

  const succeeded = result !== null && result.errors.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { handleDismiss(); } }}>
      <Dialog.Trigger asChild>
        <Button variant="outline" onClick={handleOpen}>
          <Upload className="size-4" />
          Import
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Select a CSV file to import. All rows must be valid — if any row has an error,
            no records will be inserted.
          </Dialog.Description>

          {templateError !== null && (
            <div
              role="alert"
              className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
            >
              Could not save template: {templateError}
            </div>
          )}

          {succeeded && (
            <div
              role="status"
              className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              Successfully imported {result.inserted} {result.inserted === 1 ? "record" : "records"}.
            </div>
          )}

          {result !== null && result.errors.length > 0 && (
            <div
              role="alert"
              className="border-destructive bg-destructive/10 text-destructive space-y-2 rounded-md border p-3 text-sm"
            >
              <p className="font-medium">
                Import failed — {result.errors.length} {result.errors.length === 1 ? "error" : "errors"} found.
                No records were inserted.
              </p>
              <ul className="list-inside list-disc space-y-0.5 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    {e.row > 0 ? <span className="font-medium">Row {e.row}: </span> : null}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-sm"
              onClick={() => setColumnRefOpen((v) => !v)}
            >
              {columnRefOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
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
          </div>

          <div className="flex gap-3">
            {!succeeded && (
              <Button onClick={handleImport} disabled={busy}>
                {importing
                  ? <><Loader2 className="size-4 animate-spin" /> Importing…</>
                  : <><FolderOpen className="size-4" /> Select File</>}
              </Button>
            )}
            <Button variant="outline" onClick={downloadTemplate} disabled={busy}>
              {downloadingTemplate
                ? <><Loader2 className="size-4 animate-spin" /> Downloading…</>
                : <><Download className="size-4" /> Download Template</>}
            </Button>
            <Dialog.Close asChild>
              <Button variant="outline" disabled={busy} onClick={handleDismiss}>
                {succeeded ? "Close" : "Cancel"}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
