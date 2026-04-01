import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { SessionWithRelations, ClientWithTherapist } from "@/types/ipc";
import { SessionStatus, SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";
import { getOverduePlaceholders } from "@/lib/calendar-utils";
import { useSessionFilters } from "@/hooks/useSessionFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [clients, setClients] = useState<ClientWithTherapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, c] = await Promise.all([ipc.listSessions(), ipc.listClients()]);
        setSessions(s);
        setClients(c);
      } catch (err) {
        log.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const [overdueOpen, setOverdueOpen] = useState(false);

  const {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    handleSort, sortIndicator,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
    reset,
  } = useSessionFilters(sessions);

  const overdue = useMemo(() => {
    const therapistIds = therapistFilter !== "all"
      ? new Set([Number(therapistFilter)])
      : undefined;
    let result = getOverduePlaceholders(clients, sessions, new Map(), therapistIds, 2);
    if (clientFilter !== "all") {
      result = result.filter((o) => o.clientId === Number(clientFilter));
    }
    if (dateFromFilter) {
      const from = new Date(dateFromFilter);
      result = result.filter((o) => o.start >= from);
    }
    if (dateToFilter) {
      const to = new Date(dateToFilter);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => o.start <= to);
    }
    return result;
  }, [clients, sessions, therapistFilter, clientFilter, dateFromFilter, dateToFilter]);

  return (
    <div className="space-y-4">
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
              <label className="text-muted-foreground mr-4 flex cursor-pointer items-center gap-1.5 text-xs">
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
          From
          <Input
            type="date"
            aria-label="From date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="w-40"
          />
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          To
          <Input
            type="date"
            aria-label="To date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="w-40"
          />
        </label>
      </div>

      {!loading && overdue.length > 0 && (
        <div className="border-destructive my-6 w-full rounded-md border px-4 py-3">
          <button
            className="text-destructive flex w-full cursor-pointer items-center gap-2 text-sm font-semibold"
            onClick={() => setOverdueOpen((o) => !o)}
          >
            Overdue expected sessions
            <span className="bg-destructive rounded-full px-2 py-0.5 text-xs text-white">
              {overdue.length}
            </span>
            <span className="ml-auto text-xs">{overdueOpen ? "▲" : "▼"}</span>
          </button>
          {overdueOpen && (
            <div className="mt-3 min-w-0 overflow-x-auto">
              <table className="w-full min-w-[480px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2 pr-4 font-medium">Expected date</th>
                    <th className="py-2 pr-4 font-medium">Client</th>
                    <th className="py-2 pr-4 font-medium">Therapist</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((o) => {
                    const client = clients.find((c) => c.id === o.clientId);
                    const therapist = client?.therapist;
                    const dateStr = format(o.start, "yyyy-MM-dd");
                    const timeStr = format(o.start, "HH:mm");
                    return (
                      <tr key={o.id} className="border-b">
                        <td className="py-2 pr-4">{format(o.start, "dd MMM yyyy")}</td>
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
                                `/sessions/new?clientId=${o.clientId}&date=${dateStr}&time=${timeStr}`,
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

      {loading ? (
        <Spinner />
      ) : (
        <div className="min-w-0 overflow-x-auto">
        <table className="min-w-[640px] w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
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
      )}
    </div>
  );
}
