import { useNavigate } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { useClientFilters, ClientStatusFilter } from "@/hooks/useClientFilters";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
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
    sortFn: (a, b) => Number(a.is_closed) - Number(b.is_closed),
    render: (c) => (
      <Badge variant={c.is_closed ? BadgeVariant.Closed : BadgeVariant.Open}>
        {c.is_closed ? "Closed" : "Open"}
      </Badge>
    ),
  },
];

export default function ClientsPage() {
  const navigate = useNavigate();

  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  const {
    search, setSearch,
    statusFilter, setStatusFilter,
    therapistFilter, setTherapistFilter,
    filtered, sortedTherapists,
    showMine, selectedTherapistId,
    reset,
  } = useClientFilters(clients);

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Clients</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Reset Filters</Button>
            <Link to="/clients/new" className={buttonVariants()}>Add Client</Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Search
          <Input
            placeholder="Search name or hospital number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Status
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ClientStatusFilter)}
          >
            <SelectTrigger className="w-36" aria-label="Status filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ClientStatusFilter.Open}>Open</SelectItem>
              <SelectItem value={ClientStatusFilter.Closed}>Closed</SelectItem>
              <SelectItem value={ClientStatusFilter.All}>All</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Therapist</span>
            {selectedTherapistId !== null && (
              <label className="text-muted-foreground mr-3 flex cursor-pointer items-center gap-1.5 text-xs">
                Mine
                <input
                  type="checkbox"
                  checked={showMine}
                  onChange={(e) =>
                    setTherapistFilter(
                      e.target.checked ? String(selectedTherapistId) : "all",
                    )
                  }
                />
              </label>
            )}
          </div>
          <SearchableSelect
            className="w-52"
            aria-label="Therapist filter"
            value={therapistFilter}
            onValueChange={setTherapistFilter}
            placeholder="All therapists"
            options={[
              { value: "all", label: "All therapists" },
              ...sortedTherapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
            ]}
          />
        </div>
        </div>
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
