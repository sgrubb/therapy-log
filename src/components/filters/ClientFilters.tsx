import { useMemo } from "react";
import { useClients } from "@/context/ClientsContext";
import { ClientStatus } from "@shared/types/enums";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { sortableName } from "@/lib/utils";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClientFilters() {
  const {
    search, setSearch,
    statusFilter, setStatusFilter,
    therapistFilter, setTherapistFilter,
    showMine,
    reset,
  } = useClients();

  const { therapists, selectedTherapistId } = useSelectedTherapist();

  const sortedTherapists = useMemo(
    () => [...therapists].sort((a, b) => sortableName(a).localeCompare(sortableName(b))),
    [therapists],
  );

  return (
    <FilterToolbar onReset={reset}>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Search</span>
        <Input
          placeholder="Search name or hospital number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Status</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ClientStatus)}
        >
          <SelectTrigger className="w-36" aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ClientStatus.Open}>Open</SelectItem>
            <SelectItem value={ClientStatus.Closed}>Closed</SelectItem>
            <SelectItem value={ClientStatus.All}>All</SelectItem>
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
            ...sortedTherapists.map((t) => ({
              value: t.id.toString(),
              label: `${t.first_name} ${t.last_name}`,
            })),
          ]}
        />
      </div>
    </FilterToolbar>
  );
}
