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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { therapists } = useTherapist();

  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

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
      .sort((a, b) => b.scheduled_at.getTime() - a.scheduled_at.getTime());
  }, [sessions, clientFilter, therapistFilter, statusFilter, dateFromFilter, dateToFilter]);

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

        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Therapist
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
        </label>

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
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Client</th>
              <th className="py-2 pr-4 font-medium">Therapist</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Delivery</th>
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
