import { useMemo } from "react";
import { AlertCircle, Clock, X } from "lucide-react";
import { cn, sortableName } from "@/lib/utils";
import { useSessions, DatePreset } from "@/context/SessionsContext";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SessionStatus } from "@shared/types/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SessionFilters() {
  const {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    datePreset, setDatePreset,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    overdueOnly, handleOverdueOnly,
    unconfirmedOnly, handleUnconfirmedOnly,
    overlappingOnly, handleOverlappingOnly,
    overlappingIds, unconfirmedIds, overdueIds,
    showMine,
    allClients,
    reset,
  } = useSessions();

  const { therapists, selectedTherapistId } = useSelectedTherapist();

  const sortedTherapists = useMemo(
    () => [...therapists].sort((a, b) => sortableName(a).localeCompare(sortableName(b))),
    [therapists],
  );

  const sortedClients = useMemo(
    () => [...allClients]
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
      .map((c) => ({ value: c.id.toString(), label: `${c.last_name}, ${c.first_name}` })),
    [allClients],
  );

  const overdueCount = overdueIds.size;
  const unconfirmedCount = unconfirmedIds.size;
  const overlappingCount = overlappingIds.size;

  return (
    <FilterToolbar onReset={reset}>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Client</span>
        <SearchableSelect
          className="w-52"
          aria-label="Client filter"
          value={clientFilter}
          onValueChange={setClientFilter}
          placeholder="All clients"
          options={[
            { value: "all", label: "All clients" },
            ...sortedClients,
          ]}
        />
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

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Status</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" aria-label="Status filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(SessionStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Date range</span>
          <Select
            value={datePreset}
            onValueChange={(v) => setDatePreset(v as DatePreset)}
          >
            <SelectTrigger className="w-36" aria-label="Date range preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DatePreset.ThisWeek}>This week</SelectItem>
              <SelectItem value={DatePreset.ThisMonth}>This month</SelectItem>
              <SelectItem value={DatePreset.AllTime}>All time</SelectItem>
              <SelectItem value={DatePreset.Custom}>Custom range</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">From</span>
            {dateFromFilter && (
              <button
                className="text-muted-foreground hover:text-foreground mr-3"
                onClick={() => setDateFromFilter("")}
                aria-label="Clear from date"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <Input
            type="date"
            aria-label="From date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className={cn(
              "w-40",
              datePreset !== DatePreset.Custom && "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">To</span>
            {dateToFilter && (
              <button
                className="text-muted-foreground hover:text-foreground mr-3"
                onClick={() => setDateToFilter("")}
                aria-label="Clear to date"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <Input
            type="date"
            aria-label="To date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className={cn(
              "w-40",
              datePreset !== DatePreset.Custom && "text-muted-foreground",
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={cn(
          "flex items-center gap-1.5 text-xs",
          overdueCount === 0
            ? "cursor-default text-muted-foreground/50"
            : "cursor-pointer text-muted-foreground",
        )}>
          <input
            type="checkbox"
            checked={overdueOnly}
            disabled={overdueCount === 0}
            onChange={(e) => handleOverdueOnly(e.target.checked)}
          />
          Overdue only
          <span className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
            overdueCount > 0 ? "bg-red-400" : "bg-muted-foreground/30",
          )}>
            <Clock size={10} />
            {overdueCount}
          </span>
        </label>
        <label className={cn(
          "flex items-center gap-1.5 text-xs",
          unconfirmedCount === 0
            ? "cursor-default text-muted-foreground/50"
            : "cursor-pointer text-muted-foreground",
        )}>
          <input
            type="checkbox"
            checked={unconfirmedOnly}
            disabled={unconfirmedCount === 0}
            onChange={(e) => handleUnconfirmedOnly(e.target.checked)}
          />
          Unconfirmed only
          <span className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
            unconfirmedCount > 0 ? "bg-amber-400" : "bg-muted-foreground/30",
          )}>
            <Clock size={10} />
            {unconfirmedCount}
          </span>
        </label>
        <label className={cn(
          "flex items-center gap-1.5 text-xs",
          overlappingCount === 0
            ? "cursor-default text-muted-foreground/50"
            : "cursor-pointer text-muted-foreground",
        )}>
          <input
            type="checkbox"
            checked={overlappingOnly}
            disabled={overlappingCount === 0}
            onChange={(e) => handleOverlappingOnly(e.target.checked)}
          />
          Overlapping only
          <span className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
            overlappingCount > 0 ? "bg-red-400" : "bg-muted-foreground/30",
          )}>
            <AlertCircle size={10} />
            {overlappingCount}
          </span>
        </label>
      </div>
    </FilterToolbar>
  );
}
