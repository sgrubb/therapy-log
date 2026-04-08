import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock } from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, getDay } from "date-fns";
import { startOfWeekMon } from "@/lib/datetime-utils";
import { enGB } from "date-fns/locale";
import { CalendarProvider, useCalendar } from "@/context/CalendarContext";
import { CalendarFilters } from "@/components/filters/CalendarFilters";
import type { CalendarEvent } from "@/lib/calendar-utils";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: startOfWeekMon,
  getDay,
  locales: { "en-GB": enGB },
});

function EventComponent({ event }: { event: CalendarEvent }) {
  return (
    <div className="h-full overflow-hidden px-1 py-0.5 text-xs text-white" title={event.title}>
      {event.isOverlapping && (
        <AlertCircle size={10} className="mb-0.5 mr-1 inline shrink-0" aria-label="Overlapping session" />
      )}
      {event.isUnconfirmed && (
        <Clock size={10} className="mb-0.5 mr-1 inline shrink-0" aria-label="Unconfirmed session" />
      )}
      {event.isOverdue && (
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
      if (event.isPlaceholder) {
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
      const durationMins = Math.round((end.getTime() - start.getTime()) / 60_000);
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
        <h1 className="text-2xl font-semibold">Calendar</h1>
      </div>

      <CalendarFilters />

      <div className="min-h-0 flex-1">
        <Calendar
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
          eventPropGetter={eventPropGetter as never}
          components={{ event: EventComponent as never }}
          scrollToTime={new Date(1970, 0, 1, 9, 0, 0)}
          style={{ height: "100%" }}
          culture="en-GB"
        />
      </div>
    </div>
  );
}
