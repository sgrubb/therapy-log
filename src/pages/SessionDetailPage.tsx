import { format } from "date-fns";
import { useParams, useLocation, Link } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { SessionStatus } from "@shared/types/enums";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES, MISSED_REASON_NAMES } from "@/lib/display";
import { buttonVariants } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/info-row";
import { PageHeader } from "@/components/ui/page-header";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as { from?: string; fromLabel?: string } | null;
  const backTo = locationState?.from ?? "/sessions";
  const backLabel = locationState?.fromLabel ?? "Back to Sessions";

  const sessionId = Number(id);

  const { data: session } = useSuspenseQuery({
    queryKey: queryKeys.sessions.detail(sessionId),
    queryFn: () => ipc.getSession(sessionId),
  });

  const date = format(session.scheduled_at, "dd MMM yyyy");
  const time = format(session.scheduled_at, "HH:mm");
  const durationLabel = `${Math.floor(session.duration / 60)}h ${String(session.duration % 60).padStart(2, "0")}m`;
  const showMissedReason =
    session.status !== SessionStatus.Attended && !!session.missed_reason;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader>
        <div className="space-y-1">
          <Link to={backTo} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            ← {backLabel}
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">
              <Link
                to={`/clients/${session.client_id}`}
                className="hover:underline"
              >
                {session.client.first_name} {session.client.last_name}
              </Link>
              {" "}— {date}
            </h1>
            <Link
              to={`/sessions/${id}/edit`}
              state={{ from: `/sessions/${id}` }}
              className={buttonVariants({ variant: "outline" })}
            >
              Edit
            </Link>
          </div>
        </div>
      </PageHeader>

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
        <InfoRow label="Duration" value={durationLabel} />
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
