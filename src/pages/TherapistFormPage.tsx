import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { useTherapistForm } from "@/hooks/useTherapistForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import { PageHeader } from "@/components/ui/page-header";
import { FormState } from "@/types/enums";

export default function TherapistFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { therapists, selectedTherapistId } = useSelectedTherapist();

  const selectedTherapist = therapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;

  useEffect(() => {
    if (!isAdmin) {
      navigate("/therapists", {
        replace: true,
        state: { error: "You do not have permission to manage therapists." },
      });
    }
  }, [isAdmin, navigate]);

  const {
    form,
    formState,
    saveError,
    getConflictError,
    isEdit,
    set,
    handleSubmit,
    markTouched,
    getError,
  } = useTherapistForm(id !== undefined ? Number(id) : undefined);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader>
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Edit Therapist" : "Add Therapist"}
        </h1>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <SaveErrorAlert message={saveError} />

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
        </div>

        <Field label="Is Admin" error={getError("is_admin")} conflictError={getConflictError("is_admin")}>
          <input
            type="checkbox"
            aria-label="Is admin"
            checked={form.is_admin}
            onChange={(e) => set("is_admin", e.target.checked)}
          />
        </Field>

        <div className="flex gap-3">
          <Button type="submit" disabled={formState === FormState.Saving}>
            {formState === FormState.Saving
              ? "Saving…"
              : isEdit
                ? "Save Changes"
                : "Add Therapist"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => navigate("/therapists")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
