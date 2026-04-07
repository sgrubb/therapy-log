import { format } from "date-fns";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { InfoRow } from "@/components/ui/info-row";
import { PageHeader } from "@/components/ui/page-header";
import { CloseClientDialog } from "@/components/CloseClientDialog";
import { ReopenClientDialog } from "@/components/ReopenClientDialog";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { SortDir } from "@/types/enums";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";
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

  const { data: allSessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => ipc.listSessions(),
  });

  const sessions = useMemo(
    () => allSessions.filter((s) => s.client_id === clientId),
    [allSessions, clientId],
  );

  type Session = (typeof sessions)[number];

  const sessionColumns: Column<Session>[] = [
    {
      key: "date",
      label: "Date",
      sortFn: (a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime(),
      render: (s) => format(s.scheduled_at, "dd/MM/yyyy"),
    },
    {
      key: "type",
      label: "Type",
      sortFn: (a, b) => a.session_type.localeCompare(b.session_type),
      render: (s) => SESSION_TYPE_NAMES[s.session_type] ?? s.session_type,
    },
    {
      key: "status",
      label: "Status",
      sortFn: (a, b) => a.status.localeCompare(b.status),
      render: (s) => s.status,
    },
    {
      key: "delivery",
      label: "Delivery",
      sortFn: (a, b) => a.delivery_method.localeCompare(b.delivery_method),
      render: (s) => DELIVERY_METHOD_NAMES[s.delivery_method] ?? s.delivery_method,
    },
  ];

  const selectedTherapist = contextTherapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;
  const canCloseOrReopen = isAdmin || selectedTherapistId === client.therapist_id;

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
              <Badge variant={client.closed_date !== null ? BadgeVariant.Closed : BadgeVariant.Open}>
                {client.closed_date !== null ? "Closed" : "Open"}
              </Badge>
            </div>
            <div className="flex gap-2">
              {canCloseOrReopen && (
                client.closed_date !== null ? (
                  <ReopenClientDialog
                    clientId={clientId}
                    client={client}
                  />
                ) : (
                  <CloseClientDialog
                    clientId={clientId}
                    client={client}
                  />
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

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <InfoRow label="Hospital Number" value={client.hospital_number} />
        <InfoRow
          label="Date of Birth"
          value={format(client.dob, "dd/MM/yyyy")}
        />
        <InfoRow
          label="Start Date"
          value={format(client.start_date, "dd/MM/yyyy")}
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
        {client.closed_date !== null && (
          <>
            <InfoRow
              label="Closed Date"
              value={format(client.closed_date, "dd/MM/yyyy")}
            />
            <InfoRow
              label="Post Score"
              value={client.post_score?.toString() ?? "—"}
            />
            <InfoRow label="Outcome" value={client.outcome ?? "—"} />
          </>
        )}
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
          defaultSortKey="date"
          defaultSortDir={SortDir.Desc}
          onRowClick={(s) => navigate(`/sessions/${s.id}`, {
            state: { from: `/clients/${clientId}`, fromLabel: "Back to Client" },
          })}
          emptyMessage="No sessions recorded."
        />
      </div>
    </div>
  );
}
