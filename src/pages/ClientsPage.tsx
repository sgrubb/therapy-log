import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import type { ClientWithTherapist } from "@/types/ipc";
import { useClientFilters } from "@/hooks/useClientFilters";
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

export default function ClientsPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientWithTherapist[]>([]);
  const [loading, setLoading] = useState(true);

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

  const {
    search, setSearch,
    statusFilter, setStatusFilter,
    therapistFilter, setTherapistFilter,
    handleSort, sortIndicator,
    sorted, sortedTherapists,
    showMine, selectedTherapistId,
  } = useClientFilters(clients);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button onClick={() => navigate("/clients/new")}>Add Client</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Search
          <Input
            placeholder="Search name or hospital number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Status
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "open" | "closed" | "all")}
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
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="min-w-0 overflow-x-auto">
        <table className="min-w-[580px] w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("name")}>
                Name{sortIndicator("name")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("hospital_number")}>
                Hospital No.{sortIndicator("hospital_number")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("therapist")}>
                Therapist{sortIndicator("therapist")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 pr-4 font-medium" onClick={() => handleSort("session_day")}>
                Session Day{sortIndicator("session_day")}
              </th>
              <th className="hover:text-foreground cursor-pointer select-none py-2 font-medium" onClick={() => handleSort("status")}>
                Status{sortIndicator("status")}
              </th>
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
                <td colSpan={5} className="text-muted-foreground py-6 text-center">
                  No clients found.
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
