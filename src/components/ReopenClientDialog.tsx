import type { ClientWithTherapist } from "@/types/ipc";
import { useReopenClient } from "@/hooks/useReopenClient";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";

interface Props {
  clientId: number;
  client: ClientWithTherapist;
  onSuccess: (updated: ClientWithTherapist) => void;
}

export function ReopenClientDialog({ clientId, client, onSuccess }: Props) {
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
  } = useReopenClient(clientId, client, onSuccess);

  const saving = formState === "saving";

  return (
    <>
      <Button onClick={openReopenDialog}>
        Reopen Client
      </Button>

      {showReopenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background w-full max-w-md space-y-4 rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Reopen Client</h2>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to reopen this client? Their post-intervention
              score and outcome will be cleared.
            </p>

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
              <Button
                variant="outline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={dismissReopenDialog}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
