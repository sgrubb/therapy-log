import { Dialog } from "radix-ui";
import type { ClientWithTherapist } from "@/types/ipc";
import { useReopenClient } from "@/hooks/useReopenClient";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";

interface Props {
  clientId: number;
  client: ClientWithTherapist;
}

export function ReopenClientDialog({ clientId, client }: Props) {
  const {
    showReopenDialog,
    form,
    saveError,
    formState,
    getError,
    markTouched,
    set,
    openReopenDialog,
    dismissReopenDialog,
    handleReopenClient,
  } = useReopenClient(clientId, client);

  const saving = formState === "saving";

  return (
    <Dialog.Root open={showReopenDialog} onOpenChange={(open) => { if (!open) { dismissReopenDialog(); } }}>
      <Dialog.Trigger asChild>
        <Button onClick={openReopenDialog}>Reopen Client</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">Reopen Client</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Are you sure you want to reopen this client? Their post-intervention
            score and outcome will be cleared.
          </Dialog.Description>

          <SaveErrorAlert message={saveError} />

          <Field
            label={`Notes (${(form.reopen_notes ?? "").length}/500)`}
            error={getError("reopen_notes")}
          >
            <Textarea
              aria-label="Reopen notes"
              value={form.reopen_notes ?? ""}
              onChange={(e) => set("reopen_notes", e.target.value)}
              onBlur={() => markTouched("reopen_notes")}
              rows={3}
              aria-invalid={!!getError("reopen_notes")}
            />
          </Field>

          <div className="flex gap-3">
            <Button onClick={handleReopenClient} disabled={saving}>
              {saving ? "Reopening…" : "Confirm Reopen"}
            </Button>
            <Dialog.Close asChild>
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
