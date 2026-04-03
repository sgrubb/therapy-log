import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTherapist } from "@/context/TherapistContext";
import { useSessionForm } from "@/hooks/useSessionForm";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import {
  SessionType,
  DeliveryMethod,
  SessionStatus,
  MissedReason,
  SESSION_TYPE_NAMES,
  DELIVERY_METHOD_NAMES,
  MISSED_REASON_NAMES,
} from "@/types/enums";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SessionFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { therapists } = useTherapist();

  const cancelTarget = (location.state as { from?: string } | null)?.from ?? "/sessions";

  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  const sessionId = id !== undefined ? Number(id) : undefined;
  const defaults = sessionId === undefined
    ? {
        clientId: searchParams.get("clientId") ?? undefined,
        date: searchParams.get("date") ?? undefined,
        time: searchParams.get("time") ?? undefined,
        therapistId: searchParams.get("therapistId") ?? undefined,
        durationMins: searchParams.get("duration") ?? undefined,
      }
    : undefined;

  const {
    form,
    formState,
    saveError,
    getConflictError,
    isEdit,
    set,
    setClient,
    handleSubmit,
    markTouched,
    getError,
  } = useSessionForm(sessionId, defaults);

  useEffect(() => {
    if (defaults?.clientId) {
      setClient(defaults.clientId, clients);
    }
  }, []); // runs once on mount; clients is stable after Suspense resolves

  // Sort: current therapist's clients first, then alphabetically
  const sortedClients = [...clients].sort((a, b) => {
    const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
    const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
    if (form.therapist_id) {
      const tid = Number(form.therapist_id);
      const aIsMine = a.therapist_id === tid;
      const bIsMine = b.therapist_id === tid;
      if (aIsMine && !bIsMine) {
        return -1;
      }
      if (!aIsMine && bIsMine) {
        return 1;
      }
    }
    return aName.localeCompare(bName);
  });

  const showMissedReason = !!form.status && form.status !== SessionStatus.Attended;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? "Edit Session" : "Log Session"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <SaveErrorAlert message={saveError} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client *" error={getError("client_id")} conflictError={getConflictError("client_id")}>
            <SearchableSelect
              value={form.client_id}
              onValueChange={(v) => setClient(v, clients)}
              aria-label="Client"
              aria-invalid={!!getError("client_id")}
              onBlur={() => markTouched("client_id")}
              placeholder="Select client…"
              options={sortedClients.map((c) => ({ value: c.id.toString(), label: `${c.first_name} ${c.last_name}` }))}
            />
          </Field>

          <Field label="Therapist *" error={getError("therapist_id")} conflictError={getConflictError("therapist_id")}>
            <SearchableSelect
              value={form.therapist_id}
              onValueChange={(v) => set("therapist_id", v)}
              aria-label="Therapist"
              aria-invalid={!!getError("therapist_id")}
              onBlur={() => markTouched("therapist_id")}
              placeholder="Select therapist…"
              options={therapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` }))}
            />
          </Field>

          <Field label="Date *" error={getError("date")} conflictError={getConflictError("date")}>
            <Input
              type="date"
              aria-label="Date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              onBlur={() => markTouched("date")}
              aria-invalid={!!getError("date")}
            />
          </Field>

          <Field label="Time *" error={getError("time")} conflictError={getConflictError("time")}>
            <Input
              type="time"
              aria-label="Time"
              value={form.time ?? ""}
              onChange={(e) => set("time", e.target.value)}
              onBlur={() => markTouched("time")}
              aria-invalid={!!getError("time")}
            />
          </Field>

          <Field label="Duration *" error={getError("duration")} conflictError={getConflictError("duration")}>
            <Input
              type="time"
              aria-label="Duration"
              value={form.duration ?? ""}
              onChange={(e) => set("duration", e.target.value)}
              onBlur={() => markTouched("duration")}
              aria-invalid={!!getError("duration")}
              min="00:05"
              max="12:00"
            />
          </Field>

          <Field label="Session Type *" error={getError("session_type")} conflictError={getConflictError("session_type")}>
            <Select
              value={form.session_type}
              onValueChange={(v) => set("session_type", v as SessionType)}
            >
              <SelectTrigger
                aria-label="Session type"
                aria-invalid={!!getError("session_type")}
                onBlur={() => markTouched("session_type")}
              >
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SessionType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {SESSION_TYPE_NAMES[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Delivery Method *" error={getError("delivery_method")} conflictError={getConflictError("delivery_method")}>
            <Select
              value={form.delivery_method}
              onValueChange={(v) => set("delivery_method", v as DeliveryMethod)}
            >
              <SelectTrigger
                aria-label="Delivery method"
                aria-invalid={!!getError("delivery_method")}
                onBlur={() => markTouched("delivery_method")}
              >
                <SelectValue placeholder="Select method…" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DeliveryMethod).map((m) => (
                  <SelectItem key={m} value={m}>
                    {DELIVERY_METHOD_NAMES[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status *" error={getError("status")} conflictError={getConflictError("status")}>
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
            <Field label="Missed Reason *" error={getError("missed_reason")} conflictError={getConflictError("missed_reason")}>
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
        </div>

        <Field
          label={`Notes (${(form.notes ?? "").length}/1000)`}
          error={getError("notes")}
          conflictError={getConflictError("notes")}
        >
          <Textarea
            aria-label="Notes"
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            onBlur={() => markTouched("notes")}
            rows={4}
            aria-invalid={!!getError("notes")}
          />
        </Field>

        <div className="flex gap-3">
          <Button type="submit" disabled={formState === "saving"}>
            {formState === "saving"
              ? "Saving…"
              : isEdit
                ? "Save Changes"
                : "Log Session"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => navigate(cancelTarget)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
