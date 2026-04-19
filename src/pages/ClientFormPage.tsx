import { useParams, useNavigate, useLocation } from "react-router-dom";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { useClientForm } from "@/hooks/use-client-form";
import { SessionDay, Outcome, DeliveryMethod } from "@shared/types/enums";
import { DELIVERY_METHOD_NAMES } from "@/lib/labels";
import { FormState } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DurationInput } from "@/components/ui/duration-input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTherapists: therapists } = useSelectedTherapist();

  const cancelTarget = (location.state as { from?: string } | null)?.from ?? "/clients";

  const {
    form,
    formState,
    saveError,
    getConflictError,
    isEdit,
    isClosed,
    set,
    handleSubmit,
    markTouched,
    getError,
  } = useClientForm(id !== undefined ? Number(id) : undefined);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader>
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Edit Client" : "Add Client"}
        </h1>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <SaveErrorAlert message={saveError} />

        {/* Personal Information */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name *" error={getError("first_name")} conflictError={getConflictError("first_name")}>
              <Input
                id="first_name"
                aria-label="First name"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                onBlur={() => markTouched("first_name")}
                aria-invalid={!!getError("first_name")}
              />
            </Field>
            <Field label="Last Name *" error={getError("last_name")} conflictError={getConflictError("last_name")}>
              <Input
                id="last_name"
                aria-label="Last name"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                onBlur={() => markTouched("last_name")}
                aria-invalid={!!getError("last_name")}
              />
            </Field>
            <Field label="Hospital Number *" error={getError("hospital_number")} conflictError={getConflictError("hospital_number")}>
              <Input
                id="hospital_number"
                aria-label="Hospital number"
                value={form.hospital_number}
                onChange={(e) => set("hospital_number", e.target.value)}
                onBlur={() => markTouched("hospital_number")}
                aria-invalid={!!getError("hospital_number")}
              />
            </Field>
            <Field label="Date of Birth *" error={getError("dob")} conflictError={getConflictError("dob")}>
              <Input
                id="dob"
                type="date"
                aria-label="Date of birth"
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
                onBlur={() => markTouched("dob")}
                aria-invalid={!!getError("dob")}
              />
            </Field>
            <Field label="Phone" error={getError("phone")} conflictError={getConflictError("phone")}>
              <Input
                id="phone"
                type="tel"
                aria-label="Phone"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                onBlur={() => markTouched("phone")}
                aria-invalid={!!getError("phone")}
              />
            </Field>
            <Field label="Email" error={getError("email")} conflictError={getConflictError("email")}>
              <Input
                id="email"
                type="email"
                aria-label="Email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => markTouched("email")}
                aria-invalid={!!getError("email")}
              />
            </Field>
          </div>
          <Field label="Address" error={getError("address")} conflictError={getConflictError("address")}>
            <Textarea
              aria-label="Address"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              onBlur={() => markTouched("address")}
              rows={2}
            />
          </Field>
        </section>

        {/* Clinical Details */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Clinical Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Therapist *"
              error={getError("therapist_id")}
              conflictError={getConflictError("therapist_id")}
            >
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
            <Field label="Start Date *" error={getError("start_date")} conflictError={getConflictError("start_date")}>
              <Input
                id="start_date"
                type="date"
                aria-label="Start date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                onBlur={() => markTouched("start_date")}
                aria-invalid={!!getError("start_date")}
                disabled={isEdit}
              />
            </Field>
            {isEdit && isClosed && (
              <Field label="Close Date" error={getError("closed_date")} conflictError={getConflictError("closed_date")}>
                <Input
                  type="date"
                  aria-label="Close date"
                  value={form.closed_date ?? ""}
                  onChange={(e) => set("closed_date", e.target.value)}
                  onBlur={() => markTouched("closed_date")}
                  aria-invalid={!!getError("closed_date")}
                />
              </Field>
            )}
            <Field label="Pre Score" error={getError("pre_score")} conflictError={getConflictError("pre_score")}>
              <Input
                type="number"
                step="0.1"
                aria-label="Pre score"
                value={form.pre_score ?? ""}
                onChange={(e) => set("pre_score", e.target.value)}
                onBlur={() => markTouched("pre_score")}
              />
            </Field>
            {isEdit && isClosed && (
              <>
                <Field label="Post Score" error={getError("post_score")} conflictError={getConflictError("post_score")}>
                  <Input
                    type="number"
                    step="0.1"
                    aria-label="Post score"
                    value={form.post_score ?? ""}
                    onChange={(e) => set("post_score", e.target.value)}
                    onBlur={() => markTouched("post_score")}
                  />
                </Field>
                <Field label="Outcome" error={getError("outcome")} conflictError={getConflictError("outcome")}>
                  <Select
                    value={form.outcome ?? ""}
                    onValueChange={(v) => set("outcome", v as Outcome)}
                  >
                    <SelectTrigger
                      aria-label="Outcome"
                      onBlur={() => markTouched("outcome")}
                    >
                      <SelectValue placeholder="None" />
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
              </>
            )}
            <Field label="Session Day" error={getError("session_day")} conflictError={getConflictError("session_day")}>
              <Select
                value={form.session_day ?? ""}
                onValueChange={(v) => set("session_day", v as SessionDay)}
              >
                <SelectTrigger
                  aria-label="Session day"
                  onBlur={() => markTouched("session_day")}
                >
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SessionDay).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Session Time" error={getError("session_time")} conflictError={getConflictError("session_time")}>
              <Input
                type="time"
                aria-label="Session time"
                value={form.session_time ?? ""}
                onChange={(e) => set("session_time", e.target.value)}
                onBlur={() => markTouched("session_time")}
              />
            </Field>
            <Field label="Session Duration" error={getError("session_duration")} conflictError={getConflictError("session_duration")}>
              <DurationInput
                aria-label="Session duration"
                value={form.session_duration}
                onChange={(v) => set("session_duration", v)}
                onBlur={() => markTouched("session_duration")}
              />
            </Field>
            <Field label="Session Delivery Method" error={getError("session_delivery_method")} conflictError={getConflictError("session_delivery_method")}>
              <Select
                value={form.session_delivery_method ?? ""}
                onValueChange={(v) => set("session_delivery_method", v as DeliveryMethod)}
              >
                <SelectTrigger
                  aria-label="Session delivery method"
                  onBlur={() => markTouched("session_delivery_method")}
                >
                  <SelectValue placeholder="None" />
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
        </section>

        <div className="flex gap-3">
          <Button type="submit" disabled={formState === FormState.Saving}>
            {formState === FormState.Saving
              ? "Saving…"
              : isEdit
                ? "Save Changes"
                : "Add Client"}
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
