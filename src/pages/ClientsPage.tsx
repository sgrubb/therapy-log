import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Download, Loader2 } from "lucide-react";
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
import { CLIENT_CSV_DESCRIPTIONS } from "@/lib/labels";
import type { Column } from "@/components/ui/data-table";
import type { ClientWithTherapist } from "@shared/types/clients";

const CLIENT_COLUMNS = CLIENT_CSV_HEADERS.map((name) => ({
  name,
  required: (CLIENT_REQUIRED_HEADERS as readonly string[]).includes(name),
  description: CLIENT_CSV_DESCRIPTIONS[name],
}));

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
        therapistId: therapistFilter !== "all" ? therapistFilter : null,
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
              onImport={() => ipc.importClientsCsv()}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.clients.root })}
              onDownloadTemplate={() => ipc.saveClientsTemplate()}
            />
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              title={`Export ${totalClients} client${totalClients === 1 ? "" : "s"}`}
            >
              {exporting
                ? <><Loader2 className="size-4 animate-spin" /> Exporting…</>
                : <><Download className="size-4" /> Export</>}
            </Button>
            <Link to="/clients/new" className={buttonVariants()}>
              <UserPlus className="size-4" />
              Add Client
            </Link>
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
