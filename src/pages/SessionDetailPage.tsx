import { format } from "date-fns";
import { formatDisplayDate } from "@/lib/utils/datetime";
import { toDuration } from "@/lib/utils/sessions";
import { useParams, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { sessionId as mkSessionId } from "@shared/types/brands";
import { queryKeys } from "@/lib/query-keys";
import { SessionStatus } from "@shared/types/enums";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES, MISSED_REASON_NAMES } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/info-row";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmSessionDialog } from "@/components/ConfirmSessionDialog";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as { from?: string; fromLabel?: string } | null;
  const backTo = locationState?.from ?? "/sessions";
  const backLabel = locationState?.fromLabel ?? "Back to Sessions";

  const sessionId = mkSessionId(Number(id));

  const { data: session } = useSuspenseQuery({
    queryKey: queryKeys.sessions.detail(sessionId),
    queryFn: () => ipc.getSession(sessionId),
  });

  const date = formatDisplayDate(session.scheduled_at);
  const time = format(session.scheduled_at, "HH:mm");
  const duration = toDuration(session.duration);
  const durationLabel = `${duration.hours}h ${duration.minutes}m`;
  const isUnconfirmed = session.status === null;
  const showOccurredAt = session.occurred_at !== null;
  const showMissedReason =
    (session.status === SessionStatus.DNA || session.status === SessionStatus.Cancelled)
    && !!session.missed_reason;
  const showOutcome = session.scheduled_at < new Date() || session.status !== null;

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="max-w-3xl">
        <PageHeader>
          <div className="space-y-1">
            <Link to={backTo} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-4" />
              {backLabel}
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
              <div className="flex gap-2">
                {isUnconfirmed && <ConfirmSessionDialog session={session} />}
                <Link
                  to={`/sessions/${id}/edit`}
                  state={{ from: `/sessions/${id}` }}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </PageHeader>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="max-w-3xl space-y-6 pb-6">
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Session Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
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
              <InfoRow label="Scheduled Date" value={date} />
              <InfoRow label="Scheduled Time" value={time} />
              <InfoRow label="Duration" value={durationLabel} />
              <InfoRow
                label="Delivery Method"
                value={DELIVERY_METHOD_NAMES[session.delivery_method]}
              />
              <InfoRow
                label="Session Type"
                value={SESSION_TYPE_NAMES[session.session_type]}
              />
            </div>
          </div>

          {showOutcome && (
            <div className="space-y-3 rounded-lg border p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Session Outcome
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Status" value={session.status ?? "Unconfirmed"} />
                {showMissedReason && (
                  <InfoRow
                    label="Missed Reason"
                    value={MISSED_REASON_NAMES[session.missed_reason!]}
                  />
                )}
                {showOccurredAt && (
                  <>
                    <InfoRow label="Occurred Date" value={formatDisplayDate(session.occurred_at!)} />
                    <InfoRow label="Occurred Time" value={format(session.occurred_at!, "HH:mm")} />
                  </>
                )}
              </div>
            </div>
          )}

          {session.notes && (
            <div className="space-y-1 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm font-medium">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
