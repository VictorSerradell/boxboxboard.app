// /app/lib/export-calendar.ts
// Generates .ics file and Google Calendar links from scheduled series

import type { SeriesSeason } from "../types/iracing";
import { getSeasonStartDate } from "./season-week";

// iRacing weeks start on Tuesday — each week is 7 days
function getWeekStartDate(series: SeriesSeason, weekNum: number): Date {
  const start = getSeasonStartDate(series.season_year, series.season_quarter);
  const date = new Date(start);
  date.setDate(date.getDate() + weekNum * 7);
  return date;
}

function getWeekEndDate(series: SeriesSeason, weekNum: number): Date {
  const start = getWeekStartDate(series, weekNum);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICS(str: string): string {
  return str.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
}

export interface CalendarEvent {
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
}

/** Build all calendar events from a list of scheduled series */
export function buildEvents(scheduledSeries: SeriesSeason[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const series of scheduledSeries) {
    if (!series.schedules?.length) continue;

    series.schedules.forEach((week, wi) => {
      const start = getWeekStartDate(series, wi);
      const end = getWeekEndDate(series, wi);

      const trackName =
        week.track.track_name +
        (week.track.config_name ? ` — ${week.track.config_name}` : "");

      events.push({
        title: `${series.series_name} — W${wi + 1}`,
        description: `iRacing ${series.series_name}\nWeek ${wi + 1} of ${series.schedules.length}\nCircuit: ${trackName}\nSeason ${series.season_quarter} ${series.season_year}`,
        start,
        end,
        location: trackName,
      });
    });
  }

  // Sort by start date
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Generate .ics file content */
export function generateICS(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PitBoard//iRacing Season Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:PitBoard — My iRacing Schedule",
    "X-WR-TIMEZONE:UTC",
  ];

  for (const event of events) {
    const uid = `pitboard-${event.start.getTime()}-${Math.random().toString(36).slice(2)}@pitboard.app`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART;VALUE=DATE:${formatICSDate(event.start).slice(0, 8)}`,
      `DTEND;VALUE=DATE:${formatICSDate(event.end).slice(0, 8)}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      event.location ? `LOCATION:${escapeICS(event.location)}` : "",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

/** Download .ics file in the browser */
export function downloadICS(series: SeriesSeason[]): void {
  const events = buildEvents(series);
  const content = generateICS(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pitboard-schedule.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Generate a Google Calendar "Add event" URL for a single week */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGCalDate(event.start).slice(0, 8)}/${formatGCalDate(event.end).slice(0, 8)}`,
    details: event.description,
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
