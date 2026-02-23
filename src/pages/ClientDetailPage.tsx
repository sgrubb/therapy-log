import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import type { ClientWithTherapist, SessionWithRelations } from "@/types/ipc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientWithTherapist | null>(null);
  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const [clientData, sessionData] = await Promise.all([
          ipc.getClient(Number(id)),
          ipc.listSessions(),
        ]);
        setClient(clientData);
        setSessions(
          sessionData
            .filter((s) => s.client_id === Number(id))
            .sort((a, b) => b.scheduled_at.getTime() - a.scheduled_at.getTime()),
        );
      } catch (err) {
        console.error("Failed to load client:", err);
        navigate("/clients");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!client) return null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/clients")}
          >
            ← Back to Clients
          </Button>
          <h1 className="text-2xl font-semibold">
            {client.first_name} {client.last_name}
          </h1>
          <Badge variant={client.is_closed ? "closed" : "open"}>
            {client.is_closed ? "Closed" : "Open"}
          </Badge>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/clients/${id}/edit`)}
        >
          Edit
        </Button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <InfoRow label="Hospital Number" value={client.hospital_number} />
        <InfoRow
          label="Date of Birth"
          value={client.dob.toLocaleDateString("en-GB")}
        />
        <InfoRow
          label="Therapist"
          value={`${client.therapist.first_name} ${client.therapist.last_name}`}
        />
        <InfoRow label="Session Day" value={client.session_day ?? "—"} />
        <InfoRow label="Session Time" value={client.session_time ?? "—"} />
        <InfoRow label="Phone" value={client.phone ?? "—"} />
        <InfoRow label="Email" value={client.email ?? "—"} />
        <InfoRow label="Address" value={client.address ?? "—"} />
        <InfoRow
          label="Pre Score"
          value={client.pre_score?.toString() ?? "—"}
        />
        <InfoRow
          label="Post Score"
          value={client.post_score?.toString() ?? "—"}
        />
        <InfoRow label="Outcome" value={client.outcome ?? "—"} />
      </div>

      {client.notes && (
        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Session history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <Button variant="outline" size="sm" disabled>
            Add Session
          </Button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sessions recorded.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2 pr-4">
                    {s.scheduled_at.toLocaleDateString("en-GB")}
                  </td>
                  <td className="py-2 pr-4">{s.session_type}</td>
                  <td className="py-2 pr-4">{s.status}</td>
                  <td className="py-2">{s.delivery_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
