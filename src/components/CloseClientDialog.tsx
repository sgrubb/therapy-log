import { Dialog } from "radix-ui";
import { Outcome } from "@shared/types/enums";
import { FormState } from "@/lib/types/enums";
import type { ClientWithTherapist } from "@shared/types/clients";
import { useCloseClient } from "@/hooks/use-close-client";
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
}

export function CloseClientDialog({ clientId, client }: Props) {
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
  } = useCloseClient(clientId, client);

  const saving = formState === FormState.Saving;

  return (
    <Dialog.Root open={showCloseDialog} onOpenChange={(open) => { if (!open) { dismissCloseDialog(); } }}>
      <Dialog.Trigger asChild>
        <Button onClick={openCloseDialog}>Close</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">Close Client</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Are you sure you want to close this client? This action marks them
            as no longer active.
          </Dialog.Description>

          <SaveErrorAlert message={saveError} />

          <Field label="Close Date *" error={getError("close_date")}>
            <Input
              type="date"
              aria-label="Close date"
              value={form.close_date}
              onChange={(e) => set("close_date", e.target.value)}
              onBlur={() => markTouched("close_date")}
              aria-invalid={!!getError("close_date")}
            />
          </Field>

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
