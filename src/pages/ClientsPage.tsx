import { useNavigate } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { useClientFilters } from "@/hooks/useClientFilters";
import { Badge } from "@/components/ui/badge";
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
    handleSort, sortIndicator,
    sorted, sortedTherapists,
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
            <Button onClick={() => navigate("/clients/new")}>Add Client</Button>
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
            onValueChange={(v) => setStatusFilter(v as "open" | "closed" | "all")}
          >
            <SelectTrigger className="w-36" aria-label="Status filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="all">All</SelectItem>
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

      <div className="min-w-0 overflow-x-auto">
        <table className="min-w-[580px] w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("name")}>
                Name{sortIndicator("name")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("hospital_number")}>
                Hospital No.{sortIndicator("hospital_number")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("therapist")}>
                Therapist{sortIndicator("therapist")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("session_day")}>
                Session Day{sortIndicator("session_day")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 font-medium" onClick={() => handleSort("status")}>
                Status{sortIndicator("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-muted/50 cursor-pointer border-b transition-colors"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <td className="py-2 pr-4">
                  {client.first_name} {client.last_name}
                </td>
                <td className="py-2 pr-4">{client.hospital_number}</td>
                <td className="py-2 pr-4">
                  {client.therapist.first_name} {client.therapist.last_name}
                </td>
                <td className="py-2 pr-4">{client.session_day ?? "—"}</td>
                <td className="py-2">
                  <Badge variant={client.is_closed ? "closed" : "open"}>
                    {client.is_closed ? "Closed" : "Open"}
                  </Badge>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground py-6 text-center">
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
