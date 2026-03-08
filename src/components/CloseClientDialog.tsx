import { Outcome } from "@/types/enums";
import type { ClientWithTherapist } from "@/types/ipc";
import { useCloseClient } from "@/hooks/useCloseClient";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  clientId: number;
  client: ClientWithTherapist;
  onSuccess: (updated: ClientWithTherapist) => void;
}

export function CloseClientDialog({ clientId, client, onSuccess }: Props) {
  const {
    showCloseDialog,
    form,
    saveError,
    formState,
    getError,
    markTouched,
    set,
    openCloseDialog,
    dismissCloseDialog,
    handleCloseClient,
  } = useCloseClient(clientId, client, onSuccess);

  const saving = formState === "saving";

  return (
    <>
      <Button onClick={openCloseDialog}>
        Close Client
      </Button>

      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background w-full max-w-md space-y-4 rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Close Client</h2>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to close this client? This action marks them
              as no longer active.
            </p>

            <SaveErrorAlert message={saveError} />

            <Field label="Post-intervention score" error={getError("post_score")}>
              <Input
                type="number"
                step="0.1"
                aria-label="Post-intervention score"
                value={form.post_score ?? ""}
                onChange={(e) => set("post_score", e.target.value)}
                onBlur={() => markTouched("post_score")}
              />
            </Field>

            <Field label="Outcome *" error={getError("outcome")}>
              <Select
                value={form.outcome}
                onValueChange={(v) => set("outcome", v as Outcome)}
              >
                <SelectTrigger
                  aria-label="Outcome"
                  aria-invalid={!!getError("outcome")}
                  onBlur={() => markTouched("outcome")}
                >
                  <SelectValue placeholder="Select outcome…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Outcome).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={`Closing notes (${(form.closing_notes ?? "").length}/500)`}
              error={getError("closing_notes")}
            >
              <Textarea
                aria-label="Closing notes"
                value={form.closing_notes ?? ""}
                onChange={(e) => set("closing_notes", e.target.value)}
                onBlur={() => markTouched("closing_notes")}
                rows={3}
                aria-invalid={!!getError("closing_notes")}
              />
            </Field>

            <div className="flex gap-3">
              <Button onClick={handleCloseClient} disabled={saving}>
                {saving ? "Closing…" : "Confirm Close"}
              </Button>
              <Button
                variant="outline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={dismissCloseDialog}
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
