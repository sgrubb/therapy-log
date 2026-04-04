import { useNavigate, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import { useTherapist } from "@/context/TherapistContext";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { buttonVariants } from "@/components/ui/button";
import { sortableName } from "@/lib/utils";
import type { Column } from "@/components/ui/data-table";

export default function TherapistsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { therapists, selectedTherapistId } = useTherapist();

  const pageError = (location.state as { error?: string } | null)?.error ?? null;

  const selectedTherapist = therapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;

  type Therapist = (typeof therapists)[number];

  const columns: Column<Therapist>[] = [
    {
      key: "name",
      label: "Name",
      sortFn: (a, b) => sortableName(a).localeCompare(sortableName(b)),
      render: (t) => `${t.first_name} ${t.last_name}`,
    },
    ...(isAdmin ? [{
      key: "admin",
      label: "Admin",
      render: (t: Therapist) => (
        t.is_admin
          ? <div className="flex justify-center"><Check size={14} /></div>
          : null
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Therapists</h1>
          {isAdmin && (
            <Link to="/therapists/new" className={buttonVariants()}>
              Add Therapist
            </Link>
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

      <DataTable
        data={therapists}
        columns={columns}
        keyFn={(t) => t.id}
        defaultSortKey="name"
        onRowClick={isAdmin ? (t) => navigate(`/therapists/${t.id}/edit`) : undefined}
        emptyMessage="No therapists found."
      />
    </div>
  );
}
