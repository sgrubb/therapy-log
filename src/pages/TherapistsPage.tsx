import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { Therapist } from "@/types/ipc";
import { useTherapist } from "@/context/TherapistContext";
import { Button } from "@/components/ui/button";

export default function TherapistsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { therapists: contextTherapists, selectedTherapistId } = useTherapist();

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError] = useState<string | null>(
    (location.state as { error?: string } | null)?.error ?? null,
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await ipc.listTherapists();
        setTherapists(data);
      } catch (err) {
        log.error("Failed to fetch therapists:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedTherapist = contextTherapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Therapists</h1>
        {isAdmin && (
          <Button onClick={() => navigate("/therapists/new")}>
            Add Therapist
          </Button>
        )}
      </div>

      {pageError && (
        <div
          role="alert"
          className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
        >
          {pageError}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
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
                    {therapist.is_admin ? "✓" : ""}
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
      )}
    </div>
  );
}
