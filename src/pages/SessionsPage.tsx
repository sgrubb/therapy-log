import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { SessionWithRelations } from "@/types/ipc";
import { SessionStatus, SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";
import { useSessionFilters } from "@/hooks/useSessionFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await ipc.listSessions();
        setSessions(data);
      } catch (err) {
        log.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    handleSort, sortIndicator,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
  } = useSessionFilters(sessions);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Button onClick={() => navigate("/sessions/new")}>Log Session</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Client
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-52" aria-label="Client filter">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {uniqueClients.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select value={therapistFilter} onValueChange={setTherapistFilter}>
            <SelectTrigger className="w-52" aria-label="Therapist filter">
              <SelectValue placeholder="All therapists" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All therapists</SelectItem>
              {sortedTherapists.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.first_name} {t.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
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
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("scheduled_at")}>
                Date{sortIndicator("scheduled_at")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("client")}>
                Client{sortIndicator("client")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("therapist")}>
                Therapist{sortIndicator("therapist")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("session_type")}>
                Type{sortIndicator("session_type")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("status")}>
                Status{sortIndicator("status")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 font-medium" onClick={() => handleSort("delivery_method")}>
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
