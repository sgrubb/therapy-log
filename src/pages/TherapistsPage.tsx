import { useNavigate, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import { useTherapist } from "@/context/TherapistContext";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function TherapistsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { therapists, selectedTherapistId } = useTherapist();

  const pageError = (location.state as { error?: string } | null)?.error ?? null;

  const selectedTherapist = therapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Therapists</h1>
          {isAdmin && (
            <Button onClick={() => navigate("/therapists/new")}>
              Add Therapist
            </Button>
          )}
        </div>
      </PageHeader>

      {pageError && (
        <div
          role="alert"
          className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
        >
          {pageError}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th className="py-2 pr-4 font-medium">Name</th>
            {isAdmin && <th className="py-2 text-center font-medium">Admin</th>}
          </tr>
        </thead>
        <tbody>
          {therapists.map((therapist) => (
            <tr
              key={therapist.id}
              className={`border-b transition-colors${isAdmin ? " hover:bg-muted/50 cursor-pointer" : ""}`}
              onClick={isAdmin ? () => navigate(`/therapists/${therapist.id}/edit`) : undefined}
            >
              <td className="py-2 pr-4">
                {therapist.first_name} {therapist.last_name}
              </td>
              {isAdmin && (
                <td className="py-2 text-center">
                  {therapist.is_admin && <Check size={14} className="mx-auto" />}
                </td>
              )}
            </tr>
          ))}
          {therapists.length === 0 && (
            <tr>
              <td
                colSpan={isAdmin ? 2 : 1}
                className="text-muted-foreground py-6 text-center"
              >
                No therapists found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
