import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { TherapistProvider, useTherapists } from "@/context/TherapistContext";
import { TherapistFilters } from "@/components/filters/TherapistFilters";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { ipc } from "@/lib/ipc";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { queryKeys } from "@/lib/query-keys";
import { THERAPIST_CSV_HEADERS, THERAPIST_REQUIRED_HEADERS } from "@shared/types/csv";
import type { Column } from "@/components/ui/data-table";
import type { Therapist } from "@shared/types/therapists";

const THERAPIST_COLUMNS = [
  { name: "first_name", required: true, description: "First name" },
  { name: "last_name", required: true, description: "Last name" },
  { name: "start_date", required: true, description: "Start date (YYYY-MM-DD)" },
  { name: "is_admin", required: false, description: "true or false (default: false)" },
];

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
  const queryClient = useQueryClient();
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
  } = useTherapists();

  const [exporting, setExporting] = useState(false);

  const pageError = (location.state as { error?: string } | null)?.error ?? null;

  const selectedTherapist = allTherapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;

  const columns = buildColumns(isAdmin);

  async function handleExport() {
    setExporting(true);
    try {
      await ipc.exportTherapistsCsv({ status });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Therapists</h1>
            <RefreshButton queryKey={queryKeys.therapists.root} />
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <CsvImportDialog
                title="Import Therapists"
                columns={THERAPIST_COLUMNS}
                requiredHeaders={THERAPIST_REQUIRED_HEADERS}
                onImport={() => ipc.importTherapistsCsv()}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.therapists.root })}
                templateHeaders={THERAPIST_CSV_HEADERS}
              />
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                title={`Export ${totalTherapists} therapist${totalTherapists === 1 ? "" : "s"}`}
              >
                {exporting ? "Exporting…" : "Export"}
              </Button>
              <Link to="/therapists/new" className={buttonVariants()}>
                Add Therapist
              </Link>
            </div>
          )}
        </div>
        {isAdmin && <TherapistFilters />}
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
        onRowClick={isAdmin ? (t) => navigate(`/therapists/${t.id}`) : undefined}
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
