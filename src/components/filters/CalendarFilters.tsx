import { AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/context/CalendarContext";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

export function CalendarFilters() {
  const {
    selectedTherapistIds, setTherapistIds,
    showExpectedSessions, setShowExpectedSessions,
    showOverlappingOnly, handleOverlappingOnly,
    unconfirmedOnly, handleUnconfirmedOnly,
    overdueOnly, handleOverdueOnly,
    therapistOptions,
    overdueIds, unconfirmedIds, overlappingIds,
    reset,
  } = useCalendar();

  return (
    <FilterToolbar onReset={reset}>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Therapists (max 5)</span>
        <div className="w-56">
          <SearchableMultiSelect
            options={therapistOptions}
            value={selectedTherapistIds}
            onChange={setTherapistIds}
            placeholder="Select therapists…"
            maxSelections={5}
          />
        </div>
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={showExpectedSessions}
              onChange={(e) => setShowExpectedSessions(e.target.checked)}
            />
            Show expected
          </label>
          {showExpectedSessions && (
            <label className={cn(
              "flex items-center gap-1.5 text-xs",
              overdueIds.size === 0
                ? "cursor-default text-muted-foreground/50"
                : "cursor-pointer text-muted-foreground",
            )}>
              <input
                type="checkbox"
                checked={overdueOnly}
                disabled={overdueIds.size === 0}
                onChange={(e) => handleOverdueOnly(e.target.checked)}
              />
              Overdue only
              <span className={cn(
                "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
                overdueIds.size > 0 ? "bg-red-400" : "bg-muted-foreground/30",
              )}>
                <Clock size={10} />
                {overdueIds.size}
              </span>
            </label>
          )}
        </div>
        <label className={cn(
          "flex items-center gap-1.5 text-xs",
          unconfirmedIds.size === 0
            ? "cursor-default text-muted-foreground/50"
            : "cursor-pointer text-muted-foreground",
        )}>
          <input
            type="checkbox"
            checked={unconfirmedOnly}
            disabled={unconfirmedIds.size === 0}
            onChange={(e) => handleUnconfirmedOnly(e.target.checked)}
          />
          Unconfirmed only
          <span className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
            unconfirmedIds.size > 0 ? "bg-amber-400" : "bg-muted-foreground/30",
          )}>
            <Clock size={10} />
            {unconfirmedIds.size}
          </span>
        </label>
        <label className={cn(
          "flex items-center gap-1.5 text-xs",
          overlappingIds.size === 0
            ? "cursor-default text-muted-foreground/50"
            : "cursor-pointer text-muted-foreground",
        )}>
          <input
            type="checkbox"
            checked={showOverlappingOnly}
            disabled={overlappingIds.size === 0}
            onChange={(e) => handleOverlappingOnly(e.target.checked)}
          />
          Overlapping only
          <span className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
            overlappingIds.size > 0 ? "bg-red-400" : "bg-muted-foreground/30",
          )}>
            <AlertCircle size={10} />
            {overlappingIds.size}
          </span>
        </label>
      </div>
    </FilterToolbar>
  );
}
