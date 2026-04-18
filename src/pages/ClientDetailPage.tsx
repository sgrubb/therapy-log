import { formatDisplayDate } from "@/lib/utils/datetime";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { InfoRow } from "@/components/ui/info-row";
import { PageHeader } from "@/components/ui/page-header";
import { CloseClientDialog } from "@/components/CloseClientDialog";
import { ReopenClientDialog } from "@/components/ReopenClientDialog";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { SortDir } from "@shared/types/enums";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES, OUTCOME_NAMES } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { therapists: contextTherapists, selectedTherapistId } = useSelectedTherapist();

  const clientId = Number(id);

  const { data: client } = useSuspenseQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: () => ipc.getClient(clientId),
  });

  const [sessionSortKey, setSessionSortKey] = useState("scheduled_at");
  const [sessionSortDir, setSessionSortDir] = useState<SortDir>(SortDir.Desc);

  function handleSessionSort(key: string) {
    if (key === sessionSortKey) {
      setSessionSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
    } else {
      setSessionSortKey(key);
      setSessionSortDir(SortDir.Asc);
    }
  }

  const rangeParams = {
    clientId,
    sortKey: sessionSortKey,
    sortDir: sessionSortDir,
  };

  const { data: sessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.range(rangeParams),
    queryFn: () => ipc.listSessionsRange(rangeParams),
  });

  type Session = (typeof sessions)[number];

  const sessionColumns: Column<Session>[] = [
    {
      key: "scheduled_at",
      label: "Date",
      sortable: true,
      render: (s) => formatDisplayDate(s.scheduled_at),
    },
    {
      key: "session_type",
      label: "Type",
      sortable: true,
      render: (s) => SESSION_TYPE_NAMES[s.session_type] ?? s.session_type,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (s) => s.status,
    },
    {
      key: "delivery_method",
      label: "Delivery",
      sortable: true,
      render: (s) => DELIVERY_METHOD_NAMES[s.delivery_method] ?? s.delivery_method,
    },
  ];

  const selectedTherapist = contextTherapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;
  const canCloseOrReopen = isAdmin || selectedTherapistId === client.therapist_id;
  const isClosed = client.closed_date !== null;

  const durationLabel = client.session_duration != null
    ? `${Math.floor(client.session_duration / 60)}h ${String(client.session_duration % 60).padStart(2, "0")}m`
    : "—";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <PageHeader>
        <div className="space-y-1">
          <Link to="/clients" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            ← Back to Clients
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {client.first_name} {client.last_name}
              </h1>
              <Badge variant={isClosed ? BadgeVariant.Closed : BadgeVariant.Open}>
                {isClosed ? "Closed" : "Open"}
              </Badge>
            </div>
            <div className="flex gap-2">
              {canCloseOrReopen && (
                isClosed ? (
                  <ReopenClientDialog clientId={clientId} client={client} />
                ) : (
                  <CloseClientDialog clientId={clientId} client={client} />
                )
              )}
              <Link
                to={`/clients/${id}/edit`}
                state={{ from: `/clients/${id}` }}
                className={buttonVariants({ variant: "outline" })}
              >
                Edit
              </Link>
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Personal information */}
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Personal Information
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Hospital Number" value={client.hospital_number} />
          <InfoRow label="Date of Birth" value={formatDisplayDate(client.dob)} />
          <InfoRow label="Phone" value={client.phone ?? "—"} />
          <InfoRow label="Email" value={client.email ?? "—"} />
        </div>
        {client.address && (
          <InfoRow label="Address" value={client.address} />
        )}
      </div>

      {/* Clinical details */}
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Clinical Details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            label="Therapist"
            value={`${client.therapist.first_name} ${client.therapist.last_name}`}
            className="col-span-2"
          />
          <InfoRow label="Start Date" value={formatDisplayDate(client.start_date)} />
          {isClosed && (
            <InfoRow label="Closed Date" value={formatDisplayDate(client.closed_date!)} />
          )}
          <InfoRow label="Pre Score" value={client.pre_score?.toString() ?? "—"} />
          {isClosed && (
            <>
              <InfoRow label="Post Score" value={client.post_score?.toString() ?? "—"} />
              <InfoRow label="Outcome" value={client.outcome ? (OUTCOME_NAMES[client.outcome] ?? client.outcome) : "—"} />
            </>
          )}
          <InfoRow label="Session Day" value={client.session_day ?? "—"} />
          <InfoRow label="Session Time" value={client.session_time ?? "—"} />
          <InfoRow label="Session Duration" value={durationLabel} />
          <InfoRow
            label="Session Delivery"
            value={client.session_delivery_method != null
              ? DELIVERY_METHOD_NAMES[client.session_delivery_method]
              : "—"}
          />
        </div>
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
          <Link
            to={`/sessions/new?clientId=${clientId}`}
            state={{ from: `/clients/${clientId}` }}
            className={buttonVariants({ variant: "outline" })}
          >
            Add Session
          </Link>
        </div>
        <DataTable
          data={sessions}
          columns={sessionColumns}
          keyFn={(s) => s.id}
          sortKey={sessionSortKey}
          sortDir={sessionSortDir}
          onSort={handleSessionSort}
          onRowClick={(s) => navigate(`/sessions/${s.id}`, {
            state: { from: `/clients/${clientId}`, fromLabel: "Back to Client" },
          })}
          emptyMessage="No sessions recorded."
        />
      </div>
    </div>
  );
}
