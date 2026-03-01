import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTherapist } from "@/context/TherapistContext";
import { ipc } from "@/lib/ipc";
import type { SessionWithRelations } from "@/types/ipc";
import { SessionStatus, SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SessionSortKey = "scheduled_at" | "client" | "therapist" | "session_type" | "status" | "delivery_method";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { therapists, selectedTherapistId } = useTherapist();

  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sortKey, setSortKey] = useState<SessionSortKey>("scheduled_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  function handleSort(key: SessionSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await ipc.listSessions();
        setSessions(data);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sortedTherapists = useMemo(
    () =>
      [...therapists].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
        ),
      ),
    [therapists],
  );

  const uniqueClients = useMemo(() => {
    const { clients } = sessions.reduce(
      (acc, s) => {
        if (!acc.seen.has(s.client_id)) {
          acc.seen.add(s.client_id);
          acc.clients.push({ id: s.client_id, name: `${s.client.last_name}, ${s.client.first_name}` });
        }
        return acc;
      },
      { seen: new Set<number>(), clients: [] as { id: number; name: string }[] },
    );
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    const from = dateFromFilter ? new Date(dateFromFilter) : null;
    const to = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null;

    return [...sessions]
      .filter((s) => clientFilter === "all" || s.client_id === Number(clientFilter))
      .filter((s) => therapistFilter === "all" || s.therapist_id === Number(therapistFilter))
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !from || s.scheduled_at >= from)
      .filter((s) => !to || s.scheduled_at <= to)
      .sort((a, b) => {
        const cmp = (() => {
          switch (sortKey) {
            case "scheduled_at": return a.scheduled_at.getTime() - b.scheduled_at.getTime();
            case "client": return `${a.client.last_name} ${a.client.first_name}`.localeCompare(`${b.client.last_name} ${b.client.first_name}`);
            case "therapist": return `${a.therapist.last_name} ${a.therapist.first_name}`.localeCompare(`${b.therapist.last_name} ${b.therapist.first_name}`);
            case "session_type": return (SESSION_TYPE_NAMES[a.session_type] ?? a.session_type).localeCompare(SESSION_TYPE_NAMES[b.session_type] ?? b.session_type);
            case "status": return a.status.localeCompare(b.status);
            case "delivery_method": return (DELIVERY_METHOD_NAMES[a.delivery_method] ?? a.delivery_method).localeCompare(DELIVERY_METHOD_NAMES[b.delivery_method] ?? b.delivery_method);
          }
        })();
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [sessions, clientFilter, therapistFilter, statusFilter, dateFromFilter, dateToFilter, sortKey, sortDir]);

  function sortIndicator(key: SessionSortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

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
        <table className="w-full table-fixed text-sm">
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
                <td
                  colSpan={6}
                  className="text-muted-foreground py-6 text-center"
                >
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
