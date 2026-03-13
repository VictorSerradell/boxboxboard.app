// /app/lib/season-week.ts
// iRacing seasons always start on a Tuesday.
// Each week lasts 7 days. Seasons are 12 weeks long.
// Given a season's start date (or estimating it from year/quarter),
// returns the current race week number (0-indexed, same as race_week_num).

// Approximate season start dates per quarter
// iRacing typically starts: Q1=early Jan, Q2=early Apr, Q3=early Jul, Q4=early Oct
// These are approximate Tuesdays — real dates vary slightly each year.
const APPROX_START_DATES: Record<number, string> = {
  1: "-01-07", // ~first Tuesday of January
  2: "-04-01", // ~first Tuesday of April
  3: "-07-01", // ~first Tuesday of July
  4: "-10-01", // ~first Tuesday of October
};

/**
 * Returns the approximate start date of an iRacing season.
 * If the season has a known start_date on any schedule week, use that instead.
 */
export function getSeasonStartDate(
  year: number,
  quarter: number,
  scheduleStartDate?: string,
): Date {
  if (scheduleStartDate) return new Date(scheduleStartDate);
  const approx = `${year}${APPROX_START_DATES[quarter] ?? "-01-07"}`;
  const d = new Date(approx);
  // Adjust to the nearest Tuesday (day 2)
  const day = d.getDay();
  const diff = (2 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Returns the current race week number (0-indexed) for a given season,
 * or null if we're outside the season window (before start or after week 12).
 */
export function getCurrentRaceWeek(
  year: number,
  quarter: number,
  scheduleStartDate?: string,
): number | null {
  const now = new Date();
  const start = getSeasonStartDate(year, quarter, scheduleStartDate);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = now.getTime() - start.getTime();

  if (elapsed < 0) return null; // Season hasn't started yet
  const week = Math.floor(elapsed / msPerWeek);
  if (week > 11) return null; // Season is over (12 weeks max)

  return week;
}

/**
 * Returns a human-readable label for the current week status.
 */
export function getWeekLabel(weekNum: number): string {
  return `Week ${weekNum + 1}`;
}
