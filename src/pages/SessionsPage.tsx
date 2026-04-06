import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { getExpectedSessions, getOverlappingSessions, getUnconfirmedSessions } from "@/lib/sessions-utils";
import { useSessionFilters, DatePreset } from "@/hooks/useSessionFilters";
import { cn, sortableName } from "@/lib/utils";
import { AlertCircle, Clock, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SessionStatus, SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES, SortDir } from "@/types/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { Column } from "@/components/ui/data-table";
import type { SessionWithRelations } from "@/types/ipc";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ExpectedSessionRow {
  id: string;
  start: Date;
  clientName: string;
  therapistName: string;
  isOverdue: boolean;
  logUrl: string;
}

const expectedColumns: Column<ExpectedSessionRow>[] = [
  {
    key: "overdue_icon",
    label: "",
    className: "w-6",
    render: (s) => s.isOverdue ? (
      <span title="Overdue — no session logged">
        <Clock size={14} className="pointer-events-none text-red-400" />
      </span>
    ) : null,
  },
  {
    key: "expected_date",
    label: "Expected date",
    sortFn: (a, b) => a.start.getTime() - b.start.getTime(),
    render: (s) => format(s.start, "dd MMM yyyy"),
  },
  {
    key: "client",
    label: "Client",
    sortFn: (a, b) => a.clientName.localeCompare(b.clientName),
    render: (s) => s.clientName,
  },
  {
    key: "therapist",
    label: "Therapist",
    sortFn: (a, b) => a.therapistName.localeCompare(b.therapistName),
    render: (s) => s.therapistName,
  },
  {
    key: "action",
    label: "",
    render: (s) => (
      <div className="flex justify-end">
        <Link
          to={s.logUrl}
          state={{ from: "/sessions" }}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Log
        </Link>
      </div>
    ),
  },
];

const sessionColumns: Column<SessionWithRelations>[] = [
  {
    key: "scheduled_at",
    label: "Date",
    sortFn: (a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime(),
    render: (s) => formatDate(s.scheduled_at),
  },
  {
    key: "client",
    label: "Client",
    sortFn: (a, b) => sortableName(a.client).localeCompare(sortableName(b.client)),
    render: (s) => `${s.client.first_name} ${s.client.last_name}`,
  },
  {
    key: "therapist",
    label: "Therapist",
    sortFn: (a, b) => sortableName(a.therapist).localeCompare(sortableName(b.therapist)),
    render: (s) => `${s.therapist.first_name} ${s.therapist.last_name}`,
  },
  {
    key: "session_type",
    label: "Type",
    sortFn: (a, b) =>
      (SESSION_TYPE_NAMES[a.session_type] ?? a.session_type)
        .localeCompare(SESSION_TYPE_NAMES[b.session_type] ?? b.session_type),
    render: (s) => SESSION_TYPE_NAMES[s.session_type] ?? s.session_type,
  },
  {
    key: "status",
    label: "Status",
    sortFn: (a, b) => a.status.localeCompare(b.status),
    render: (s) => s.status,
  },
  {
    key: "delivery_method",
    label: "Delivery",
    sortFn: (a, b) =>
      (DELIVERY_METHOD_NAMES[a.delivery_method] ?? a.delivery_method)
        .localeCompare(DELIVERY_METHOD_NAMES[b.delivery_method] ?? b.delivery_method),
    render: (s) => DELIVERY_METHOD_NAMES[s.delivery_method] ?? s.delivery_method,
  },
];

export default function SessionsPage() {
  const navigate = useNavigate();

  const { data: sessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => ipc.listSessions(),
  });

  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  const [expectedOpen, setExpectedOpen] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [overlappingOnly, setOverlappingOnly] = useState(false);

  const {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    datePreset, setDatePreset,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
    reset: resetFilters,
  } = useSessionFilters(sessions);

  function reset() {
    resetFilters();
    setOverdueOnly(false);
    setUnconfirmedOnly(false);
    setOverlappingOnly(false);
    setExpectedOpen(false);
  }

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const hasBoundedRange = dateFromFilter !== "" && dateToFilter !== "";

  const expectedSessionRows = useMemo((): ExpectedSessionRow[] => {
    if (!hasBoundedRange) {
      return [];
    }

    const now = new Date();
    const rangeStart = parse(dateFromFilter, "yyyy-MM-dd", new Date());
    const rangeEnd = new Date(`${dateToFilter}T23:59:59`);

    const therapistIds = therapistFilter !== "all"
      ? new Set([Number(therapistFilter)])
      : undefined;

    return getExpectedSessions(clients, sessions, rangeStart, rangeEnd, therapistIds)
      .filter((s) => clientFilter === "all" || s.clientId === Number(clientFilter))
      .map((s) => {
        const client = clientMap.get(s.clientId);
        const therapist = client?.therapist;
        return {
          id: s.id,
          start: s.start,
          clientName: client ? `${client.first_name} ${client.last_name}` : "—",
          therapistName: therapist ? `${therapist.first_name} ${therapist.last_name}` : "—",
          isOverdue: s.start < now,
          logUrl: `/sessions/new?clientId=${s.clientId}&date=${format(s.start, "yyyy-MM-dd")}&time=${format(s.start, "HH:mm")}`,
        };
      });
  }, [clients, sessions, therapistFilter, clientFilter, dateFromFilter, dateToFilter, clientMap, hasBoundedRange]);

  const overdueCount = useMemo(
    () => expectedSessionRows.filter((s) => s.isOverdue).length,
    [expectedSessionRows],
  );

  const overlappingIds = useMemo(
    () => new Set(getOverlappingSessions(filtered).map((s) => s.id)),
    [filtered],
  );

  const unconfirmedIds = useMemo(
    () => new Set(getUnconfirmedSessions(filtered).map((s) => s.id)),
    [filtered],
  );

  const overlappingCount = useMemo(
    () => filtered.filter((s) => overlappingIds.has(s.id) && s.scheduled_at >= new Date()).length,
    [filtered, overlappingIds],
  );

  const unconfirmedCount = unconfirmedIds.size;

  const displayedSessions = useMemo(() => {
    if (unconfirmedOnly) {
      return filtered.filter((s) => unconfirmedIds.has(s.id));
    }
    if (overlappingOnly) {
      return filtered.filter((s) => overlappingIds.has(s.id) && s.scheduled_at >= new Date());
    }
    return filtered;
  }, [filtered, unconfirmedOnly, overlappingOnly, unconfirmedIds, overlappingIds]);

  const displayedExpectedRows = useMemo(
    () => overdueOnly
      ? expectedSessionRows.filter((s) => s.isOverdue)
      : expectedSessionRows,
    [expectedSessionRows, overdueOnly],
  );

  const showExpectedSection = hasBoundedRange
    && displayedExpectedRows.length > 0
    && !unconfirmedOnly
    && !overlappingOnly;

  function handleOverdueOnly(checked: boolean) {
    setOverdueOnly(checked);
    if (checked) {
      setUnconfirmedOnly(false);
      setOverlappingOnly(false);
      setExpectedOpen(true);
    }
  }

  function handleUnconfirmedOnly(checked: boolean) {
    setUnconfirmedOnly(checked);
    if (checked) {
      setOverdueOnly(false);
      setOverlappingOnly(false);
    }
  }

  function handleOverlappingOnly(checked: boolean) {
    setOverlappingOnly(checked);
    if (checked) {
      setOverdueOnly(false);
      setUnconfirmedOnly(false);
    }
  }

  const warningSessionColumns: Column<SessionWithRelations>[] = useMemo(() => [
    {
      key: "warning",
      label: "",
      className: "w-6",
      render: (s) => {
        if (overlappingIds.has(s.id) && s.scheduled_at >= new Date()) {
          return (
            <span title="Overlapping session">
              <AlertCircle size={14} className="pointer-events-none text-red-400" />
            </span>
          );
        }
        if (unconfirmedIds.has(s.id)) {
          return (
            <span title="Past session still scheduled">
              <Clock size={14} className="pointer-events-none text-amber-400" />
            </span>
          );
        }
        return null;
      },
    },
    ...sessionColumns,
  ], [overlappingIds, unconfirmedIds]);

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Reset Filters</Button>
            <Link to="/sessions/new" className={buttonVariants()}>Log Session</Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
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
              ...uniqueClients.map((c) => ({ value: c.id.toString(), label: c.name })),
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
              ...sortedTherapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
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
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
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
                datePreset !== DatePreset.Custom && "text-muted-foreground"
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
                datePreset !== DatePreset.Custom && "text-muted-foreground"
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={cn(
            "flex items-center gap-1.5 text-xs",
            overdueCount === 0 ? "cursor-default text-muted-foreground/50" : "cursor-pointer text-muted-foreground",
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
            unconfirmedCount === 0 ? "cursor-default text-muted-foreground/50" : "cursor-pointer text-muted-foreground",
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
            overlappingCount === 0 ? "cursor-default text-muted-foreground/50" : "cursor-pointer text-muted-foreground",
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
        </div>
      </PageHeader>

      {showExpectedSection && (
        <div className="my-6 w-full rounded-md border px-4 py-3">
          <button
            className="flex w-full cursor-pointer items-center gap-2 text-sm font-semibold"
            onClick={() => setExpectedOpen((prev) => !prev)}
          >
            <span className="text-muted-foreground">Expected sessions</span>
            {expectedOpen
              ? <ChevronUp size={16} className="ml-auto" />
              : <ChevronDown size={16} className="ml-auto" />
            }
          </button>
          {expectedOpen && (
            <div className="mt-3">
              <DataTable
                data={displayedExpectedRows}
                columns={expectedColumns}
                keyFn={(s) => s.id}
                defaultSortKey="expected_date"
                emptyMessage="No expected sessions."
              />
            </div>
          )}
        </div>
      )}

      <DataTable
        data={displayedSessions}
        columns={warningSessionColumns}
        keyFn={(s) => s.id}
        defaultSortKey="scheduled_at"
        defaultSortDir={SortDir.Desc}
        onRowClick={(s) => navigate(`/sessions/${s.id}`)}
        emptyMessage="No sessions found."
      />
    </div>
  );
}
