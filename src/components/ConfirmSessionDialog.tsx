import { Dialog } from "radix-ui";
import { format } from "date-fns";
import { CheckCircle2, Check, Loader2 } from "lucide-react";
import { SessionStatus, MissedReason } from "@shared/types/enums";
import { MISSED_REASON_NAMES } from "@/lib/labels";
import { FormState } from "@/lib/types/enums";
import { useConfirmSession } from "@/hooks/use-confirm-session";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  session: SessionWithClientAndTherapist;
}

export function ConfirmSessionDialog({ session }: Props) {
  const {
    showConfirmDialog,
    form,
    saveError,
    formState,
    getError,
    markTouched,
    set,
    openConfirmDialog,
    dismissConfirmDialog,
    handleConfirm,
  } = useConfirmSession(session);

  const saving = formState === FormState.Saving;
  const showMissedReason =
    form.status === SessionStatus.DNA || form.status === SessionStatus.Cancelled;
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Dialog.Root
      open={showConfirmDialog}
      onOpenChange={(open) => {
        if (!open) {
          dismissConfirmDialog();
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button onClick={openConfirmDialog}>
          <CheckCircle2 className="size-4" />
          Confirm
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">Confirm Session</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Record what happened. Defaults to the scheduled date and time — change if
            the session occurred at a different time.
          </Dialog.Description>

          <SaveErrorAlert message={saveError} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Occurred Date *" error={getError("occurred_date")}>
              <Input
                type="date"
                aria-label="Occurred date"
                max={today}
                value={form.occurred_date}
                onChange={(e) => set("occurred_date", e.target.value)}
                onBlur={() => markTouched("occurred_date")}
                aria-invalid={!!getError("occurred_date")}
              />
            </Field>
            <Field label="Occurred Time *" error={getError("occurred_time")}>
              <Input
                type="time"
                aria-label="Occurred time"
                value={form.occurred_time}
                onChange={(e) => set("occurred_time", e.target.value)}
                onBlur={() => markTouched("occurred_time")}
                aria-invalid={!!getError("occurred_time")}
              />
            </Field>
          </div>

          <Field label="Status *" error={getError("status")}>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as SessionStatus)}
            >
              <SelectTrigger
                aria-label="Status"
                aria-invalid={!!getError("status")}
                onBlur={() => markTouched("status")}
              >
                <SelectValue placeholder="Select status…" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SessionStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {showMissedReason && (
            <Field label="Missed Reason *" error={getError("missed_reason")}>
              <Select
                value={form.missed_reason ?? ""}
                onValueChange={(v) => set("missed_reason", v as MissedReason)}
              >
                <SelectTrigger
                  aria-label="Missed reason"
                  aria-invalid={!!getError("missed_reason")}
                  onBlur={() => markTouched("missed_reason")}
                >
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MissedReason).map((r) => (
                    <SelectItem key={r} value={r}>
                      {MISSED_REASON_NAMES[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="flex gap-3">
            <Button onClick={handleConfirm} disabled={saving}>
              {saving
                ? <><Loader2 className="size-4 animate-spin" /> Confirming…</>
                : <><Check className="size-4" /> Confirm Session</>}
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
