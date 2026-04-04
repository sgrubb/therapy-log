import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { getExpectedSessions } from "@/lib/expected-sessions";
import { useSessionFilters } from "@/hooks/useSessionFilters";
import { useSortableTable, SortDir } from "@/hooks/useSortableTable";
import { sortableName } from "@/lib/utils";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { DatePreset } from "@/hooks/useSessionFilters";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SessionStatus, SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

  const {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    datePreset, setDatePreset,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    handleSort, sortIndicator,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
    reset,
  } = useSessionFilters(sessions);

  const {
    sortKey: expectedSortKey,
    sortDir: expectedSortDir,
    handleSort: handleExpectedSort,
    sortIndicator: expectedSortIndicator,
  } = useSortableTable<"expected_date" | "client" | "therapist">("expected_date", "asc");

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const expectedSessions = useMemo(() => {
    const now = new Date();
    const rangeStart = dateFromFilter ? new Date(dateFromFilter) : (() => {
      const day = now.getDay();
      const daysToMonday = day === 0 ? 6 : day - 1;
      const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0, 0);
      return new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7, 0, 0, 0, 0);
    })();
    const rangeEnd = dateToFilter
      ? new Date(`${dateToFilter}T23:59:59`)
      : now;

    const therapistIds = therapistFilter !== "all"
      ? new Set([Number(therapistFilter)])
      : undefined;

    const results = getExpectedSessions(clients, sessions, rangeStart, rangeEnd, therapistIds)
      .filter((s) => clientFilter === "all" || s.clientId === Number(clientFilter));

    return [...results].sort((a, b) => {
      const cmp = (() => {
        switch (expectedSortKey) {
          case "expected_date":
            return a.start.getTime() - b.start.getTime();
          case "client": {
            const ca = clientMap.get(a.clientId);
            const cb = clientMap.get(b.clientId);
            return sortableName(ca ?? { first_name: "", last_name: "" })
              .localeCompare(sortableName(cb ?? { first_name: "", last_name: "" }));
          }
          case "therapist": {
            const ta = clientMap.get(a.clientId)?.therapist;
            const tb = clientMap.get(b.clientId)?.therapist;
            return sortableName(ta ?? { first_name: "", last_name: "" })
              .localeCompare(sortableName(tb ?? { first_name: "", last_name: "" }));
          }
        }
      })();
      return expectedSortDir === SortDir.Asc ? cmp : -cmp;
    });
  }, [clients, sessions, therapistFilter, clientFilter, dateFromFilter, dateToFilter, clientMap, expectedSortKey, expectedSortDir]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return expectedSessions.filter((s) => s.start < now).length;
  }, [expectedSessions]);

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Reset Filters</Button>
            <Button onClick={() => navigate("/sessions/new")}>Log Session</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Client
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

        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Status
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

        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Date range
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
            className="w-40"
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
            className="w-40"
          />
        </div>
        </div>
      </PageHeader>

      {expectedSessions.length > 0 && (
        <div className="my-6 w-full rounded-md border px-4 py-3">
          <button
            className="flex w-full cursor-pointer items-center gap-2 text-sm font-semibold"
            onClick={() => setExpectedOpen((prev) => !prev)}
          >
            Expected sessions
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-400 px-2 py-0.5 text-xs text-white">
                <AlertCircle size={12} />
                {overdueCount} overdue
              </span>
            )}
            <span className="ml-auto text-xs">{expectedOpen ? "▲" : "▼"}</span>
          </button>
          {expectedOpen && (
            <div className="mt-3 min-w-0 overflow-x-auto">
              <table className="w-full min-w-[480px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[26%]" />
                  <col className="w-[26%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th
                      className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                      onClick={() => handleExpectedSort("expected_date")}
                    >
                      Expected date{expectedSortIndicator("expected_date")}
                    </th>
                    <th
                      className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                      onClick={() => handleExpectedSort("client")}
                    >
                      Client{expectedSortIndicator("client")}
                    </th>
                    <th
                      className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                      onClick={() => handleExpectedSort("therapist")}
                    >
                      Therapist{expectedSortIndicator("therapist")}
                    </th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {expectedSessions.map((s) => {
                    const client = clients.find((c) => c.id === s.clientId);
                    const therapist = client?.therapist;
                    const dateStr = format(s.start, "yyyy-MM-dd");
                    const timeStr = format(s.start, "HH:mm");
                    const isOverdue = s.start < new Date();
                    return (
                      <tr key={s.id} className="border-b">
                        <td className="py-2 pr-4">
                          <span className="flex items-center justify-between pr-4">
                            {format(s.start, "dd MMM yyyy")}
                            {isOverdue && (
                              <AlertCircle size={14} className="shrink-0 text-red-400" />
                            )}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {client ? `${client.first_name} ${client.last_name}` : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {therapist ? `${therapist.first_name} ${therapist.last_name}` : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/sessions/new?clientId=${s.clientId}&date=${dateStr}&time=${timeStr}`,
                                { state: { from: "/sessions" } },
                              );
                            }}
                          >
                            Log
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 overflow-x-auto">
        <table className="min-w-[640px] w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th
                className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                onClick={() => handleSort("scheduled_at")}
              >
                Date{sortIndicator("scheduled_at")}
              </th>
              <th
                className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                onClick={() => handleSort("client")}
              >
                Client{sortIndicator("client")}
              </th>
              <th
                className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                onClick={() => handleSort("therapist")}
              >
                Therapist{sortIndicator("therapist")}
              </th>
              <th
                className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                onClick={() => handleSort("session_type")}
              >
                Type{sortIndicator("session_type")}
              </th>
              <th
                className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium"
                onClick={() => handleSort("status")}
              >
                Status{sortIndicator("status")}
              </th>
              <th
                className="hover:text-foreground cursor-pointer select-none py-2 font-medium"
                onClick={() => handleSort("delivery_method")}
              >
                Delivery{sortIndicator("delivery_method")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((session) => (
              <tr
                key={session.id}
                className="hover:bg-muted/50 cursor-pointer border-b transition-colors"
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <td className="py-2 pr-4">{formatDate(session.scheduled_at)}</td>
                <td className="py-2 pr-4">
                  {session.client.first_name} {session.client.last_name}
                </td>
                <td className="py-2 pr-4">
                  {session.therapist.first_name} {session.therapist.last_name}
                </td>
                <td className="py-2 pr-4">
                  {SESSION_TYPE_NAMES[session.session_type] ?? session.session_type}
                </td>
                <td className="py-2 pr-4">{session.status}</td>
                <td className="py-2">
                  {DELIVERY_METHOD_NAMES[session.delivery_method] ?? session.delivery_method}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground py-6 text-center">
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
