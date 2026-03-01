import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTherapist } from "@/context/TherapistContext";
import { useSessionForm } from "@/hooks/useSessionForm";
import { ipc } from "@/lib/ipc";
import {
  SessionType,
  DeliveryMethod,
  SessionStatus,
  MissedReason,
  SESSION_TYPE_NAMES,
  DELIVERY_METHOD_NAMES,
  MISSED_REASON_NAMES,
} from "@/types/enums";
import type { ClientWithTherapist } from "@/types/ipc";
import { Button } from "@/components/ui/button";
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
  const { therapists } = useTherapist();

  const [clients, setClients] = useState<ClientWithTherapist[]>([]);

  const {
    form,
    formState,
    saveError,
    isEdit,
    set,
    setClient,
    handleSubmit,
    markTouched,
    getError,
  } = useSessionForm(id !== undefined ? Number(id) : undefined);

  useEffect(() => {
    async function load() {
      try {
        const data = await ipc.listClients();
        setClients(data);
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      }
    }
    load();
  }, []);

  // Sort: current therapist's clients first, then alphabetically
  const sortedClients = [...clients].sort((a, b) => {
    const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
    const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
    if (form.therapist_id) {
      const tid = Number(form.therapist_id);
      const aIsMine = a.therapist_id === tid;
      const bIsMine = b.therapist_id === tid;
      if (aIsMine && !bIsMine) return -1;
      if (!aIsMine && bIsMine) return 1;
    }
    return aName.localeCompare(bName);
  });

  const showMissedReason = !!form.status && form.status !== SessionStatus.Attended;

  if (formState === "loading") {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? "Edit Session" : "Log Session"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <SaveErrorAlert message={saveError} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client *" error={getError("client_id")}>
            <Select
              value={form.client_id}
              onValueChange={(v) => setClient(v, clients)}
            >
              <SelectTrigger
                aria-label="Client"
                aria-invalid={!!getError("client_id")}
                onBlur={() => markTouched("client_id")}
              >
                <SelectValue placeholder="Select client…" />
              </SelectTrigger>
              <SelectContent>
                {sortedClients.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Therapist *" error={getError("therapist_id")}>
            <Select
              value={form.therapist_id}
              onValueChange={(v) => set("therapist_id", v)}
            >
              <SelectTrigger
                aria-label="Therapist"
                aria-invalid={!!getError("therapist_id")}
                onBlur={() => markTouched("therapist_id")}
              >
                <SelectValue placeholder="Select therapist…" />
              </SelectTrigger>
              <SelectContent>
                {therapists.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.first_name} {t.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Date *" error={getError("date")}>
            <Input
              type="date"
              aria-label="Date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              onBlur={() => markTouched("date")}
              aria-invalid={!!getError("date")}
            />
          </Field>

          <Field label="Time" error={getError("time")}>
            <Input
              type="time"
              aria-label="Time"
              value={form.time ?? ""}
              onChange={(e) => set("time", e.target.value)}
              onBlur={() => markTouched("time")}
            />
          </Field>

          <Field label="Session Type *" error={getError("session_type")}>
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

          <Field label="Delivery Method *" error={getError("delivery_method")}>
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
        </div>

        <Field
          label={`Notes (${(form.notes ?? "").length}/1000)`}
          error={getError("notes")}
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
            onClick={() => navigate("/sessions")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
