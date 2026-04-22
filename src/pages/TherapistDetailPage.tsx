import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { formatDisplayDate } from "@/lib/utils/datetime";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { InfoRow } from "@/components/ui/info-row";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DeactivateTherapistDialog } from "@/components/DeactivateTherapistDialog";
import { ReactivateTherapistDialog } from "@/components/ReactivateTherapistDialog";
import { buttonVariants } from "@/components/ui/button";
import { SortDir } from "@shared/types/enums";
import type { Column } from "@/components/ui/data-table";
import type { ClientWithTherapist } from "@shared/types/clients";

const clientColumns: Column<ClientWithTherapist>[] = [
  {
    key: "last_name",
    label: "Name",
    sortable: true,
    render: (c) => `${c.first_name} ${c.last_name}`,
  },
  {
    key: "hospital_number",
    label: "Hospital No.",
    sortable: true,
    render: (c) => c.hospital_number,
  },
  {
    key: "session_day",
    label: "Session Day",
    sortable: true,
    render: (c) => c.session_day ?? "—",
  },
];

export default function TherapistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { therapists: contextTherapists, selectedTherapistId } = useSelectedTherapist();

  const therapistId = Number(id);

  const selectedTherapist = contextTherapists.find((t) => t.id === selectedTherapistId);
  const isAdmin = selectedTherapist?.is_admin ?? false;

  const { data: therapist } = useSuspenseQuery({
    queryKey: queryKeys.therapists.detail(therapistId),
    queryFn: () => ipc.getTherapist(therapistId),
  });

  const [clientSortKey, setClientSortKey] = useState("last_name");
  const [clientSortDir, setClientSortDir] = useState<SortDir>(SortDir.Asc);

  function handleClientSort(key: string) {
    if (key === clientSortKey) {
      setClientSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
    } else {
      setClientSortKey(key);
      setClientSortDir(SortDir.Asc);
    }
  }

  const { data: clients } = useSuspenseQuery({
    queryKey: [...queryKeys.clients.all, { therapistId, openOnly: true }],
    queryFn: () => ipc.listAllClients({ therapistId, openOnly: true }),
  });

  const sortedClients = [...clients].sort((a, b) => {
    const getValue = (c: ClientWithTherapist): string => {
      if (clientSortKey === "hospital_number") {
        return c.hospital_number;
      }
      if (clientSortKey === "session_day") {
        return c.session_day ?? "";
      }
      return `${c.last_name} ${c.first_name}`;
    };
    const cmp = getValue(a).localeCompare(getValue(b));
    return clientSortDir === SortDir.Asc ? cmp : -cmp;
  });

  const isDeactivated = therapist.deactivated_date !== null;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <PageHeader>
        <div className="space-y-1">
          <Link to="/therapists" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            ← Back to Therapists
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {therapist.first_name} {therapist.last_name}
              </h1>
              <Badge variant={isDeactivated ? BadgeVariant.Closed : BadgeVariant.Open}>
                {isDeactivated ? "Inactive" : "Active"}
              </Badge>
            </div>
            <div className="flex gap-2">
              {isDeactivated
                ? <ReactivateTherapistDialog therapist={therapist} />
                : <DeactivateTherapistDialog therapist={therapist} />}
              <Link
                to={`/therapists/${id}/edit`}
                state={{ from: `/therapists/${id}` }}
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
          <InfoRow label="First Name" value={therapist.first_name} />
          <InfoRow label="Last Name" value={therapist.last_name} />
        </div>
      </div>

      {/* Professional information */}
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Professional Details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Start Date" value={formatDisplayDate(therapist.start_date)} />
          {isDeactivated && (
            <InfoRow label="Deactivated Date" value={formatDisplayDate(therapist.deactivated_date!)} />
          )}
          <InfoRow label="Admin" value={therapist.is_admin ? "Yes" : "No"} />
        </div>
      </div>

      {/* Active clients */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Active Clients</h2>
        <DataTable
          data={sortedClients}
          columns={clientColumns}
          keyFn={(c) => c.id}
          sortKey={clientSortKey}
          sortDir={clientSortDir}
          onSort={handleClientSort}
          onRowClick={(c) => navigate(`/clients/${c.id}`, {
            state: { from: `/therapists/${therapistId}`, fromLabel: "Back to Therapist" },
          })}
          emptyMessage="No active clients."
        />
      </div>
    </div>
  );
}
