import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock } from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { RefreshButton } from "@/components/ui/refresh-button";
import { queryKeys } from "@/lib/query-keys";
import { format, parse, getDay, differenceInMinutes } from "date-fns";
import { startOfWeekMon } from "@/lib/utils/datetime";
import { enGB } from "date-fns/locale";
import { CalendarProvider, useCalendar } from "@/context/CalendarContext";
import { CalendarFilters } from "@/components/filters/CalendarFilters";
import { isOverdue, isUnconfirmed, isOverlapping, type CalendarEvent } from "@/lib/utils/calendar";
import type { EventProps } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: startOfWeekMon,
  getDay,
  locales: { "en-GB": enGB },
});

function EventCard({ event }: EventProps<CalendarEvent>) {
  const { overlappingIds, unconfirmedIds, overdueIds } = useCalendar();
  return (
    <div className="h-full overflow-hidden px-1 py-0.5 text-xs text-white" title={event.title}>
      {isOverlapping(event, overlappingIds) && (
        <AlertCircle size={10} className="mb-0.5 mr-1 inline shrink-0" aria-label="Overlapping session" />
      )}
      {isUnconfirmed(event, unconfirmedIds) && (
        <Clock size={10} className="mb-0.5 mr-1 inline shrink-0" aria-label="Unconfirmed session" />
      )}
      {isOverdue(event, overdueIds) && (
        <Clock size={10} className="mb-0.5 mr-1 inline shrink-0" aria-label="Overdue session" />
      )}
      {event.title}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarPageContent />
    </CalendarProvider>
  );
}

function CalendarPageContent() {
  const navigate = useNavigate();
  const {
    view, setView,
    currentDate, setCurrentDate,
    events, eventPropGetter,
  } = useCalendar();

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.isExpected) {
        const dateStr = format(event.start, "yyyy-MM-dd");
        const timeStr = format(event.start, "HH:mm");
        navigate(
          `/sessions/new?clientId=${event.clientId}&date=${dateStr}&time=${timeStr}`,
          { state: { from: "/calendar" } },
        );
      } else if (event.sessionId !== undefined) {
        navigate(`/sessions/${event.sessionId}`, { state: { from: "/calendar", fromLabel: "Back to Calendar" } });
      }
    },
    [navigate],
  );

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      const dateStr = format(start, "yyyy-MM-dd");
      const timeStr = format(start, "HH:mm");
      const durationMins = differenceInMinutes(end, start);
      navigate(
        `/sessions/new?date=${dateStr}&time=${timeStr}&duration=${durationMins}`,
        { state: { from: "/calendar" } },
      );
    },
    [navigate],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <RefreshButton queryKey={queryKeys.sessions.root} />
        </div>
      </div>

      <CalendarFilters />

      <div className="min-h-0 flex-1">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          views={["week", "month"]}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          eventPropGetter={eventPropGetter}
          components={{ event: EventCard }}
          scrollToTime={new Date(1970, 0, 1, 9, 0, 0)}
          style={{ height: "100%" }}
          culture="en-GB"
        />
      </div>
    </div>
  );
}
