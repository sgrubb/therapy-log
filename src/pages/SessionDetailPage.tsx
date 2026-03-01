import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import type { SessionWithRelations } from "@/types/ipc";
import {
  SESSION_TYPE_NAMES,
  DELIVERY_METHOD_NAMES,
  MISSED_REASON_NAMES,
  SessionStatus,
} from "@/types/enums";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/info-row";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const data = await ipc.getSession(Number(id));
        setSession(data);
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Session not found.</p>
        <Button variant="outline" onClick={() => navigate("/sessions")}>
          ← Back to Sessions
        </Button>
      </div>
    );
  }

  const date = session.scheduled_at.toLocaleDateString("en-GB");
  const time = session.scheduled_at.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const showMissedReason =
    session.status !== SessionStatus.Attended && !!session.missed_reason;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/sessions")}
          >
            ← Back to Sessions
          </Button>
          <h1 className="text-2xl font-semibold">
            {session.client.first_name} {session.client.last_name}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/sessions/${id}/edit`)}
        >
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <InfoRow
          label="Client"
          value={
            <Link
              to={`/clients/${session.client_id}`}
              className="text-primary hover:underline"
            >
              {session.client.first_name} {session.client.last_name}
            </Link>
          }
        />
        <InfoRow
          label="Therapist"
          value={`${session.therapist.first_name} ${session.therapist.last_name}`}
        />
        <InfoRow label="Date" value={date} />
        <InfoRow label="Time" value={time} />
        <InfoRow
          label="Session Type"
          value={SESSION_TYPE_NAMES[session.session_type]}
        />
        <InfoRow
          label="Delivery Method"
          value={DELIVERY_METHOD_NAMES[session.delivery_method]}
        />
        <InfoRow label="Status" value={session.status} />
        {showMissedReason && (
          <InfoRow
            label="Missed Reason"
            value={MISSED_REASON_NAMES[session.missed_reason!]}
          />
        )}
      </div>

      {session.notes && (
        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}
    </div>
  );
}
