import { useNavigate, Link } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { ClientProvider, useClients } from "@/context/ClientsContext";
import { ClientFilters } from "@/components/filters/ClientFilters";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { buttonVariants } from "@/components/ui/button";
import { sortableName } from "@/lib/utils";
import type { Column } from "@/components/ui/data-table";
import type { ClientWithTherapist } from "@/types/ipc";

const columns: Column<ClientWithTherapist>[] = [
  {
    key: "name",
    label: "Name",
    sortFn: (a, b) => sortableName(a).localeCompare(sortableName(b)),
    render: (c) => `${c.first_name} ${c.last_name}`,
  },
  {
    key: "hospital_number",
    label: "Hospital No.",
    sortFn: (a, b) => a.hospital_number.localeCompare(b.hospital_number),
    render: (c) => c.hospital_number,
  },
  {
    key: "therapist",
    label: "Therapist",
    sortFn: (a, b) => sortableName(a.therapist).localeCompare(sortableName(b.therapist)),
    render: (c) => `${c.therapist.first_name} ${c.therapist.last_name}`,
  },
  {
    key: "session_day",
    label: "Session Day",
    sortFn: (a, b) => (a.session_day ?? "").localeCompare(b.session_day ?? ""),
    render: (c) => c.session_day ?? "—",
  },
  {
    key: "status",
    label: "Status",
    sortFn: (a, b) => Number(a.closed_date !== null) - Number(b.closed_date !== null),
    render: (c) => (
      <Badge variant={c.closed_date !== null ? BadgeVariant.Closed : BadgeVariant.Open}>
        {c.closed_date !== null ? "Closed" : "Open"}
      </Badge>
    ),
  },
];

export default function ClientsPage() {
  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  return (
    <ClientProvider clients={clients}>
      <ClientsPageContent />
    </ClientProvider>
  );
}

function ClientsPageContent() {
  const navigate = useNavigate();
  const { filtered } = useClients();

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Clients</h1>
          <Link to="/clients/new" className={buttonVariants()}>Add Client</Link>
        </div>
        <ClientFilters />
      </PageHeader>

      <DataTable
        data={filtered}
        columns={columns}
        keyFn={(c) => c.id}
        defaultSortKey="name"
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
        emptyMessage="No clients found."
      />
    </div>
  );
}
