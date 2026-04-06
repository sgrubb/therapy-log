import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { SessionProvider, useSessions } from "@/context/SessionsContext";
import { SessionFilters } from "@/components/filters/SessionFilters";
import { sortableName } from "@/lib/utils";
import { AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES, SortDir } from "@/types/enums";
import { DataTable } from "@/components/ui/data-table";
import type { Column } from "@/components/ui/data-table";
import type { ExpectedSessionRow } from "@/context/SessionsContext";
import type { SessionWithRelations } from "@/types/ipc";

function formatDate(d: Date): string {
  return format(d, "dd MMM yyyy");
}

const expectedColumns: Column<ExpectedSessionRow>[] = [
  {
    key: "overdue_icon",
    label: "",
    className: "w-6",
    render: (s) => s.isOverdue ? (
      <span title="Overdue — no session logged">
        <Clock size={14} className="pointer-events-none text-red-400" />
      </span>
    ) : null,
  },
  {
    key: "expected_date",
    label: "Expected date",
    sortFn: (a, b) => a.start.getTime() - b.start.getTime(),
    render: (s) => format(s.start, "dd MMM yyyy"),
  },
  {
    key: "client",
    label: "Client",
    sortFn: (a, b) => a.clientName.localeCompare(b.clientName),
    render: (s) => s.clientName,
  },
  {
    key: "therapist",
    label: "Therapist",
    sortFn: (a, b) => a.therapistName.localeCompare(b.therapistName),
    render: (s) => s.therapistName,
  },
  {
    key: "action",
    label: "",
    render: (s) => (
      <div className="flex justify-end">
        <Link
          to={s.logUrl}
          state={{ from: "/sessions" }}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Log
        </Link>
      </div>
    ),
  },
];

const sessionColumns: Column<SessionWithRelations>[] = [
  {
    key: "scheduled_at",
    label: "Date",
    sortFn: (a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime(),
    render: (s) => formatDate(s.scheduled_at),
  },
  {
    key: "client",
    label: "Client",
    sortFn: (a, b) => sortableName(a.client).localeCompare(sortableName(b.client)),
    render: (s) => `${s.client.first_name} ${s.client.last_name}`,
  },
  {
    key: "therapist",
    label: "Therapist",
    sortFn: (a, b) => sortableName(a.therapist).localeCompare(sortableName(b.therapist)),
    render: (s) => `${s.therapist.first_name} ${s.therapist.last_name}`,
  },
  {
    key: "session_type",
    label: "Type",
    sortFn: (a, b) =>
      (SESSION_TYPE_NAMES[a.session_type] ?? a.session_type)
        .localeCompare(SESSION_TYPE_NAMES[b.session_type] ?? b.session_type),
    render: (s) => SESSION_TYPE_NAMES[s.session_type] ?? s.session_type,
  },
  {
    key: "status",
    label: "Status",
    sortFn: (a, b) => a.status.localeCompare(b.status),
    render: (s) => s.status,
  },
  {
    key: "delivery_method",
    label: "Delivery",
    sortFn: (a, b) =>
      (DELIVERY_METHOD_NAMES[a.delivery_method] ?? a.delivery_method)
        .localeCompare(DELIVERY_METHOD_NAMES[b.delivery_method] ?? b.delivery_method),
    render: (s) => DELIVERY_METHOD_NAMES[s.delivery_method] ?? s.delivery_method,
  },
];

export default function SessionsPage() {
  const { data: sessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => ipc.listSessions(),
  });

  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  return (
    <SessionProvider sessions={sessions} clients={clients}>
      <SessionsPageContent />
    </SessionProvider>
  );
}

function SessionsPageContent() {
  const navigate = useNavigate();
  const {
    displayedSessions,
    displayedExpectedRows,
    showExpectedSection,
    expectedOpen, setExpectedOpen,
    overlappingIds, unconfirmedIds,
  } = useSessions();

  const warningSessionColumns: Column<SessionWithRelations>[] = useMemo(() => [
    {
      key: "warning",
      label: "",
      className: "w-6",
      render: (s) => {
        if (overlappingIds.has(s.id) && s.scheduled_at >= new Date()) {
          return (
            <span title="Overlapping session">
              <AlertCircle size={14} className="pointer-events-none text-red-400" />
            </span>
          );
        }
        if (unconfirmedIds.has(s.id)) {
          return (
            <span title="Past session still scheduled">
              <Clock size={14} className="pointer-events-none text-amber-400" />
            </span>
          );
        }
        return null;
      },
    },
    ...sessionColumns,
  ], [overlappingIds, unconfirmedIds]);

  return (
    <div className="space-y-4">
      <PageHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <Link to="/sessions/new" className={buttonVariants()}>Log Session</Link>
        </div>
        <SessionFilters />
      </PageHeader>

      {showExpectedSection && (
        <div className="my-6 w-full rounded-md border px-4 py-3">
          <button
            className="flex w-full cursor-pointer items-center gap-2 text-sm font-semibold"
            onClick={() => setExpectedOpen(!expectedOpen)}
          >
            <span className="text-muted-foreground">Expected sessions</span>
            {expectedOpen
              ? <ChevronUp size={16} className="ml-auto" />
              : <ChevronDown size={16} className="ml-auto" />
            }
          </button>
          {expectedOpen && (
            <div className="mt-3">
              <DataTable
                data={displayedExpectedRows}
                columns={expectedColumns}
                keyFn={(s) => s.id}
                defaultSortKey="expected_date"
                emptyMessage="No expected sessions."
              />
            </div>
          )}
        </div>
      )}

      <DataTable
        data={displayedSessions}
        columns={warningSessionColumns}
        keyFn={(s) => s.id}
        defaultSortKey="scheduled_at"
        defaultSortDir={SortDir.Desc}
        onRowClick={(s) => navigate(`/sessions/${s.id}`)}
        emptyMessage="No sessions found."
      />
    </div>
  );
}
