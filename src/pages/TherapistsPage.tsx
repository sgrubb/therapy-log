import { useNavigate, useLocation, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { TherapistProvider, useTherapists } from "@/context/TherapistContext";
import { DeactivateTherapistDialog } from "@/components/DeactivateTherapistDialog";
import { ReactivateTherapistDialog } from "@/components/ReactivateTherapistDialog";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";
import { TherapistStatus } from "@shared/types/enums";
import type { Column } from "@/components/ui/data-table";
import type { Therapist } from "@shared/types/therapists";

function buildColumns(isAdmin: boolean): Column<Therapist>[] {
  return [
    {
      key: "last_name",
      label: "Name",
      sortable: true,
      render: (t) => `${t.first_name} ${t.last_name}`,
    },
    ...(isAdmin ? [
      {
        key: "admin",
        label: "Admin",
        render: (t: Therapist) => (
          t.is_admin
            ? <div className="flex"><Check size={14} /></div>
            : null
        ),
      },
      {
        key: "actions",
        label: "",
        render: (t: Therapist) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            {t.deactivated_date
              ? <ReactivateTherapistDialog therapist={t} />
              : <DeactivateTherapistDialog therapist={t} />}
          </div>
        ),
      },
    ] : []),
  ];
}

export default function TherapistsPage() {
  return (
    <TherapistProvider>
      <TherapistsPageContent />
    </TherapistProvider>
  );
}

function TherapistsPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTherapistId, therapists: allTherapists } = useSelectedTherapist();
  const {
    therapists,
    totalTherapists,
    page,
    setPage,
    pageSize,
    sortKey,
    sortDir,
    setSort,
    status,
    setStatus,
  } = useTherapists();

  const pageError = (location.state as { error?: string } | null)?.error ?? null;

  const selectedTherapist = allTherapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;
  const isInactive = status === TherapistStatus.Inactive;

  const columns = buildColumns(isAdmin);

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Therapists</h1>
            <RefreshButton queryKey={queryKeys.therapists.root} />
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as TherapistStatus)}>
              <SelectTrigger className="w-32" aria-label="Status filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TherapistStatus.Active}>Active</SelectItem>
                <SelectItem value={TherapistStatus.Inactive}>Inactive</SelectItem>
                <SelectItem value={TherapistStatus.All}>All</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && !isInactive && (
              <Link to="/therapists/new" className={buttonVariants()}>
                Add Therapist
              </Link>
            )}
          </div>
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
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={setSort}
        onRowClick={isAdmin && !isInactive ? (t) => navigate(`/therapists/${t.id}/edit`) : undefined}
        emptyMessage="No therapists found."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={totalTherapists}
        onPageChange={setPage}
      />
    </div>
  );
}
