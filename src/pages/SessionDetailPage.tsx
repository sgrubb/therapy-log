import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
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
  const location = useLocation();
  const locationState = location.state as { from?: string; fromLabel?: string } | null;
  const backTo = locationState?.from ?? "/sessions";
  const backLabel = locationState?.fromLabel ?? "Back to Sessions";

  const sessionId = Number(id);

  const { data: session } = useSuspenseQuery({
    queryKey: queryKeys.sessions.detail(sessionId),
    queryFn: () => ipc.getSession(sessionId),
  });

  const date = session.scheduled_at.toLocaleDateString("en-GB");
  const time = session.scheduled_at.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const showMissedReason =
    session.status !== SessionStatus.Attended && !!session.missed_reason;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backTo)}
        >
          ← {backLabel}
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            <Link
              to={`/clients/${session.client_id}`}
              className="hover:underline"
            >
              {session.client.first_name} {session.client.last_name}
            </Link>
          </h1>
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${id}/edit`, { state: { from: `/sessions/${id}` } })}
          >
            Edit
          </Button>
        </div>
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
