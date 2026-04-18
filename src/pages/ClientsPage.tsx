import { useNavigate, Link } from "react-router-dom";
import { RefreshButton } from "@/components/ui/refresh-button";
import { queryKeys } from "@/lib/query-keys";
import { Pagination } from "@/components/ui/pagination";
import { ClientProvider, useClients } from "@/context/ClientsContext";
import { ClientFilters } from "@/components/filters/ClientFilters";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { buttonVariants } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import type { ClientWithTherapist } from "@shared/types/clients";

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
  const { clients, page, setPage, pageSize, totalClients, sortKey, sortDir, setSort } = useClients();

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Clients</h1>
            <RefreshButton queryKey={queryKeys.clients.root} />
          </div>
          <Link to="/clients/new" className={buttonVariants()}>Add Client</Link>
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
