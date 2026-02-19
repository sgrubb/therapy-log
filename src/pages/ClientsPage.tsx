import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTherapist } from "@/context/TherapistContext";
import { ipc } from "@/lib/ipc";
import type { ClientWithTherapist } from "@/types/ipc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "open" | "closed" | "all";

export default function ClientsPage() {
  const navigate = useNavigate();
  const { therapists, selectedTherapistId } = useTherapist();

  const [clients, setClients] = useState<ClientWithTherapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [therapistFilter, setTherapistFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const data = await ipc.listClients();
        setClients(data);
      } catch (err) {
        console.error("Failed to fetch clients:", err);
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

  const filtered = useMemo(() => {
    let result = clients;

    if (statusFilter === "open") result = result.filter((c) => !c.is_closed);
    if (statusFilter === "closed") result = result.filter((c) => c.is_closed);

    if (therapistFilter !== "all") {
      result = result.filter(
        (c) => c.therapist_id === Number(therapistFilter),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.hospital_number.toLowerCase().includes(q),
      );
    }

    return result;
  }, [clients, statusFilter, therapistFilter, search]);

  const sorted = useMemo(() => {
    const nameOf = (c: ClientWithTherapist) =>
      `${c.last_name} ${c.first_name}`.toLowerCase();

    if (therapistFilter !== "all") {
      return [...filtered].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    }

    if (selectedTherapistId !== null) {
      const mine = filtered
        .filter((c) => c.therapist_id === selectedTherapistId)
        .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      const others = filtered
        .filter((c) => c.therapist_id !== selectedTherapistId)
        .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      return [...mine, ...others];
    }

    return [...filtered].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }, [filtered, therapistFilter, selectedTherapistId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button onClick={() => navigate("/clients/new")}>Add Client</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or hospital number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
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

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Hospital No.</th>
              <th className="py-2 pr-4 font-medium">Therapist</th>
              <th className="py-2 pr-4 font-medium">Session Day</th>
              <th className="py-2 font-medium">Status</th>
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
                <td
                  colSpan={5}
                  className="text-muted-foreground py-6 text-center"
                >
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
