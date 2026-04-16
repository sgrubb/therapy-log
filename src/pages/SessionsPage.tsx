import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Pagination } from "@/components/ui/pagination";
import { RefreshButton } from "@/components/ui/refresh-button";
import { queryKeys } from "@/lib/queryKeys";
import { format } from "date-fns";
import { SessionProvider, useSessions } from "@/context/SessionsContext";
import { SessionFilters } from "@/components/filters/SessionFilters";
import { AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/lib/display";
import { DataTable } from "@/components/ui/data-table";
import type { Column } from "@/components/ui/data-table";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import type { ExpectedSession } from "@shared/types/sessions";

function formatDate(d: Date): string {
  return format(d, "dd MMM yyyy");
}

const expectedColumns: Column<ExpectedSession>[] = [
  {
    key: "overdue_icon",
    label: "",
    className: "w-6",
    render: (s) => s.scheduled_at < new Date() ? (
      <span title="Overdue — no session logged">
        <Clock size={14} className="pointer-events-none text-red-400" />
      </span>
    ) : null,
  },
  {
    key: "scheduled_at",
    label: "Expected date",
    sortable: true,
    render: (s) => format(s.scheduled_at, "dd MMM yyyy"),
  },
  {
    key: "client.last_name",
    label: "Client",
    sortable: true,
    render: (s) => `${s.client.first_name} ${s.client.last_name}`,
  },
  {
    key: "therapist.last_name",
    label: "Therapist",
    sortable: true,
    render: (s) => `${s.therapist.first_name} ${s.therapist.last_name}`,
  },
  {
    key: "action",
    label: "",
    render: (s) => (
      <div className="flex justify-end">
        <Link
          to={`/sessions/new?clientId=${s.client_id}&date=${format(s.scheduled_at, "yyyy-MM-dd")}&time=${format(s.scheduled_at, "HH:mm")}`}
          state={{ from: "/sessions" }}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Log
        </Link>
      </div>
    ),
  },
];

const sessionColumns: Column<SessionWithClientAndTherapist>[] = [
  {
    key: "scheduled_at",
    label: "Date",
    sortable: true,
    render: (s) => formatDate(s.scheduled_at),
  },
  {
    key: "client.last_name",
    label: "Client",
    sortable: true,
    render: (s) => `${s.client.first_name} ${s.client.last_name}`,
  },
  {
    key: "therapist.last_name",
    label: "Therapist",
    sortable: true,
    render: (s) => `${s.therapist.first_name} ${s.therapist.last_name}`,
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

export default function SessionsPage() {
  return (
    <SessionProvider>
      <SessionsPageContent />
    </SessionProvider>
  );
}

function SessionsPageContent() {
  const navigate = useNavigate();
  const {
    displayedSessions,
    displayedExpectedSessions,
    showExpectedSection,
    expectedOpen, setExpectedOpen,
    overlappingIds, unconfirmedIds,
    page, setPage,
    totalSessions, pageSize,
    unconfirmedOnly, overlappingOnly, overdueOnly,
    sortKey, sortDir, setSort,
    expectedSortKey, expectedSortDir, setExpectedSort,
  } = useSessions();

  const showPagination = !unconfirmedOnly && !overlappingOnly && !overdueOnly;
  const showMainTable = !overdueOnly;

  const warningSessionColumns: Column<SessionWithClientAndTherapist>[] = useMemo(() => [
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Sessions</h1>
            <RefreshButton queryKey={queryKeys.sessions.root} />
          </div>
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
                data={displayedExpectedSessions}
                columns={expectedColumns}
                keyFn={(s) => s.id}
                sortKey={expectedSortKey}
                sortDir={expectedSortDir}
                onSort={setExpectedSort}
                emptyMessage="No expected sessions."
              />
            </div>
          )}
        </div>
      )}

      {showMainTable && (
        <DataTable
          data={displayedSessions}
          columns={warningSessionColumns}
          keyFn={(s) => s.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={setSort}
          onRowClick={(s) => navigate(`/sessions/${s.id}`)}
          emptyMessage="No sessions found."
        />
      )}

      {showPagination && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalSessions}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
