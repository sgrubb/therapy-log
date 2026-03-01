import { useParams, useNavigate } from "react-router-dom";
import { useTherapist } from "@/context/TherapistContext";
import { useClientForm } from "@/hooks/useClientForm";
import { SessionDay, Outcome } from "@/types/enums";
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

export default function ClientFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { therapists } = useTherapist();

  const {
    form,
    formState,
    saveError,
    isEdit,
    set,
    handleSubmit,
    markTouched,
    getError,
  } = useClientForm(id !== undefined ? Number(id) : undefined);

  if (formState === "loading") {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? "Edit Client" : "Add Client"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <SaveErrorAlert message={saveError} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name *" error={getError("first_name")}>
            <Input
              id="first_name"
              aria-label="First name"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              onBlur={() => markTouched("first_name")}
              aria-invalid={!!getError("first_name")}
            />
          </Field>
          <Field label="Last Name *" error={getError("last_name")}>
            <Input
              id="last_name"
              aria-label="Last name"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              onBlur={() => markTouched("last_name")}
              aria-invalid={!!getError("last_name")}
            />
          </Field>
          <Field label="Hospital Number *" error={getError("hospital_number")}>
            <Input
              id="hospital_number"
              aria-label="Hospital number"
              value={form.hospital_number}
              onChange={(e) => set("hospital_number", e.target.value)}
              onBlur={() => markTouched("hospital_number")}
              aria-invalid={!!getError("hospital_number")}
            />
          </Field>
          <Field label="Date of Birth *" error={getError("dob")}>
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
        </div>

        <Field label="Address" error={getError("address")}>
          <Textarea
            aria-label="Address"
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            onBlur={() => markTouched("address")}
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" error={getError("phone")}>
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
          <Field label="Email" error={getError("email")}>
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

          <Field label="Session Day" error={getError("session_day")}>
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

          <Field label="Session Time" error={getError("session_time")}>
            <Input
              type="time"
              aria-label="Session time"
              value={form.session_time ?? ""}
              onChange={(e) => set("session_time", e.target.value)}
              onBlur={() => markTouched("session_time")}
            />
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
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Pre Score" error={getError("pre_score")}>
            <Input
              type="number"
              step="0.1"
              aria-label="Pre score"
              value={form.pre_score ?? ""}
              onChange={(e) => set("pre_score", e.target.value)}
              onBlur={() => markTouched("pre_score")}
            />
          </Field>
          <Field label="Post Score" error={getError("post_score")}>
            <Input
              type="number"
              step="0.1"
              aria-label="Post score"
              value={form.post_score ?? ""}
              onChange={(e) => set("post_score", e.target.value)}
              onBlur={() => markTouched("post_score")}
            />
          </Field>
          <Field label="Outcome" error={getError("outcome")}>
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
                : "Add Client"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/clients")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
