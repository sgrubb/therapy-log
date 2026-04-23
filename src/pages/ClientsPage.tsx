import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ClientProvider, useClients } from "@/context/ClientsContext";
import { ClientFilters } from "@/components/filters/ClientFilters";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { ipc } from "@/lib/ipc";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { queryKeys } from "@/lib/query-keys";
import { CLIENT_CSV_HEADERS, CLIENT_REQUIRED_HEADERS } from "@shared/types/csv";
import type { Column } from "@/components/ui/data-table";
import type { ClientWithTherapist } from "@shared/types/clients";

const CLIENT_COLUMNS = [
  { name: "hospital_number", required: true, description: "Unique hospital / NHS number" },
  { name: "first_name", required: true, description: "First name" },
  { name: "last_name", required: true, description: "Last name" },
  { name: "dob", required: true, description: "Date of birth (YYYY-MM-DD)" },
  { name: "start_date", required: true, description: "Date the client started (YYYY-MM-DD)" },
  { name: "therapist_first_name", required: true, description: "Assigned therapist first name" },
  { name: "therapist_last_name", required: true, description: "Assigned therapist last name" },
  { name: "address", required: false, description: "Home address" },
  { name: "phone", required: false, description: "Phone number" },
  { name: "email", required: false, description: "Email address" },
  { name: "session_day", required: false, description: "Monday / Tuesday / Wednesday / Thursday / Friday / Saturday / Sunday" },
  { name: "session_time", required: false, description: "Scheduled time (HH:MM)" },
  { name: "session_duration_minutes", required: false, description: "Session duration in minutes" },
  { name: "session_delivery_method", required: false, description: "InPerson / Video / Phone" },
  { name: "closed_date", required: false, description: "Date the client was closed (YYYY-MM-DD)" },
  { name: "pre_score", required: false, description: "Pre-intervention score (number)" },
  { name: "post_score", required: false, description: "Post-intervention score (number)" },
  { name: "outcome", required: false, description: "Improved / NoChange / Deteriorated / Incomplete" },
  { name: "notes", required: false, description: "Free-text notes" },
];

const columns: Column<ClientWithTherapist>[] = [
  {
    key: "last_name",
    label: "Name",
    sortable: true,
    render: (c) => `${c.first_name} ${c.last_name}`,
  },
  {
    key: "hospital_number",
    label: "Hospital No.",
    sortable: true,
    render: (c) => c.hospital_number,
  },
  {
    key: "therapist.last_name",
    label: "Therapist",
    sortable: true,
    render: (c) => `${c.therapist.first_name} ${c.therapist.last_name}`,
  },
  {
    key: "session_day",
    label: "Session Day",
    sortable: true,
    render: (c) => c.session_day ?? "—",
  },
  {
    key: "closed_date",
    label: "Status",
    sortable: true,
    render: (c) => (
      <Badge variant={c.closed_date !== null ? BadgeVariant.Closed : BadgeVariant.Open}>
        {c.closed_date !== null ? "Closed" : "Open"}
      </Badge>
    ),
  },
];

export default function ClientsPage() {
  return (
    <ClientProvider>
      <ClientsPageContent />
    </ClientProvider>
  );
}

function ClientsPageContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    clients,
    page,
    setPage,
    pageSize,
    totalClients,
    sortKey,
    sortDir,
    setSort,
    statusFilter,
    therapistFilter,
    search,
  } = useClients();

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await ipc.exportClientsCsv({
        status: statusFilter,
        therapistId: therapistFilter !== "all" ? Number(therapistFilter) : null,
        search: search.trim() || undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Clients</h1>
            <RefreshButton queryKey={queryKeys.clients.root} />
          </div>
          <div className="flex gap-2">
            <CsvImportDialog
              title="Import Clients"
              columns={CLIENT_COLUMNS}
              requiredHeaders={CLIENT_REQUIRED_HEADERS}
              onImport={() => ipc.importClientsCsv()}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.clients.root })}
              templateHeaders={CLIENT_CSV_HEADERS}
            />
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              title={`Export ${totalClients} client${totalClients === 1 ? "" : "s"}`}
            >
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Link to="/clients/new" className={buttonVariants()}>Add Client</Link>
          </div>
        </div>
        <ClientFilters />
      </PageHeader>

      <DataTable
        data={clients}
        columns={columns}
        keyFn={(c) => c.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={setSort}
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
        emptyMessage="No clients found."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={totalClients}
        onPageChange={setPage}
      />
    </div>
  );
}
