import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TriangleAlert, AlertCircle } from "lucide-react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDay } from "date-fns";
import { enGB } from "date-fns/locale";
import { useTherapist } from "@/context/TherapistContext";
import { useCalendarData } from "@/hooks/useCalendarData";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/lib/calendar-utils";
import type { Therapist } from "@/types/ipc";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { "en-GB": enGB },
});

function getRangeForDate(date: Date, view: View): { start: Date; end: Date } {
  if (view === "week") {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

function EventComponent({ event }: { event: CalendarEvent }) {
  return (
    <div className="h-full overflow-hidden px-1 py-0.5 text-xs text-white" title={event.title}>
      {event.isOverlapping && (
        <TriangleAlert size={10} className="mr-1 inline shrink-0" aria-label="Scheduling conflict" />
      )}
      {event.title}
    </div>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { therapists, selectedTherapistId } = useTherapist();

  const [view, setView] = useState<View>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRangeForDate(currentDate, view),
    [currentDate, view],
  );

  const defaultTherapistIds = selectedTherapistId !== null ? [selectedTherapistId.toString()] : [];
  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(defaultTherapistIds);
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [showOverlappingOnly, setShowOverlappingOnly] = useState(false);

  useEffect(() => {
    if (selectedTherapistId !== null) {
      setSelectedTherapistIds((prev) => {
        const id = selectedTherapistId.toString();
        return prev.includes(id) ? prev : [id, ...prev];
      });
    }
  }, [selectedTherapistId]);

  function reset() {
    setSelectedTherapistIds(selectedTherapistId !== null ? [selectedTherapistId.toString()] : []);
    setShowPlaceholders(true);
    setShowOverlappingOnly(false);
  }

  const therapistOptions = useMemo(
    () => therapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
    [therapists],
  );

  const selectedTherapists = useMemo(
    (): Therapist[] =>
      selectedTherapistIds
        .map((id) => therapists.find((t) => t.id.toString() === id))
        .filter((t): t is Therapist => t !== undefined),
    [selectedTherapistIds, therapists],
  );

  const { events, overdueCount, overlappingCount } = useCalendarData({
    selectedTherapists,
    rangeStart,
    rangeEnd,
    showPlaceholders,
    showOverlappingOnly,
  });

  const eventPropGetter = useCallback((event: CalendarEvent) => ({
    className: event.isPlaceholder ? "is-placeholder" : undefined,
    style: {
      backgroundColor: event.color,
      opacity: event.isPlaceholder ? 0.45 : 1,
      border: "none",
    },
  }), []);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleView = useCallback((v: View) => {
    setView(v);
  }, []);

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
        <Button variant="outline" onClick={reset}>Reset Filters</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Therapists (max 5)</span>
          <div className="w-56">
            <SearchableMultiSelect
              options={therapistOptions}
              value={selectedTherapistIds}
              onChange={(ids) => {
                if (selectedTherapistId !== null) {
                  const currentId = selectedTherapistId.toString();
                  setSelectedTherapistIds(
                    ids.includes(currentId) ? ids : [currentId, ...ids],
                  );
                } else {
                  setSelectedTherapistIds(ids);
                }
              }}
              placeholder="Select therapists…"
              maxSelections={5}
            />
          </div>
        </label>

        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={showPlaceholders}
              onChange={(e) => setShowPlaceholders(e.target.checked)}
            />
            Show expected sessions
            {overdueCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <AlertCircle size={12} />
                {overdueCount} overdue
              </span>
            )}
          </label>
          <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={showOverlappingOnly}
              onChange={(e) => setShowOverlappingOnly(e.target.checked)}
            />
            Show overlapping sessions only
            {overlappingCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <AlertCircle size={12} />
                {overlappingCount} overlapping
              </span>
            )}
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={handleView}
          date={currentDate}
          onNavigate={handleNavigate}
          views={["week", "month"]}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          eventPropGetter={eventPropGetter as never}
          components={{ event: EventComponent as never }}
          style={{ height: "100%" }}
          culture="en-GB"
        />
      </div>
    </div>
  );
}
