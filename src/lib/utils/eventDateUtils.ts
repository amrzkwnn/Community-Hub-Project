// ============================================================================
// TESDH Community Hub - Event & Calendar Date Utilities (Asia/Kuala_Lumpur)
// ============================================================================

import type { CommunityPost } from '../../types/index.ts';

export const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

export interface ParsedEventSchedule {
  startDate: Date;
  endDate: Date;
  dateKey: string; // Primary start date in YYYY-MM-DD
  endDateKey: string; // End date in YYYY-MM-DD
  allDateKeys: string[]; // All calendar dates spanned by this event
  scheduleString: string;
  timeString: string;
  monthShort: string; // e.g. 'OCT'
  dayNumber: string; // e.g. '24'
  venue: string;
  isMultiDay: boolean;
  crossesMidnight: boolean;
  isUpcoming: boolean;
}

export interface CalendarDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Returns a two-digit padded number string.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Formats a Date or timestamp into YYYY-MM-DD using Malaysia local time (UTC+8).
 */
export function formatToMalaysiaDateKey(dateInput: Date | string | number): string {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return '1970-01-01';
  }

  // Format using Intl.DateTimeFormat with Asia/Kuala_Lumpur timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // en-CA outputs YYYY-MM-DD directly
}

/**
 * Parse a YYYY-MM-DD string into a Date object anchored at 00:00:00 in Malaysia time (+08:00).
 */
export function parseDateKeyToMalaysiaDate(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  // Using explicit UTC ISO string with +08:00 offset
  return new Date(`${year}-${pad2(month + 1)}-${pad2(day)}T00:00:00+08:00`);
}

/**
 * Returns today's date in Malaysia timezone.
 * Defaults to 2026-10-18 if system clock is around October 2026 mock data timeline.
 */
export function getMalaysiaToday(): Date {
  const now = new Date();
  // If the machine clock is already in year 2026, respect it directly.
  if (now.getFullYear() === 2026) {
    return now;
  }
  // Baseline synchronized with the township mock data scenario (October 18, 2026)
  return new Date('2026-10-18T00:00:00+08:00');
}

/**
 * Formats Month and Year heading in Malaysia time, e.g. "October 2026".
 */
export function formatMonthYearHeader(date: Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Parses event schedule, start/end dates, multi-day coverage, and venue from CommunityPost.
 */
export function parseEventSchedule(
  event: CommunityPost,
  referenceToday?: Date
): ParsedEventSchedule {
  const today = referenceToday || getMalaysiaToday();
  let startDate: Date;
  let endDate: Date;
  let customTimeString = event.eventTime || '';
  let venue = event.eventVenue || event.authorPrecinct || 'Elmina Central Park';

  // 1. Check explicit eventDate property
  if (event.eventDate) {
    startDate = new Date(event.eventDate);
    if (isNaN(startDate.getTime())) {
      startDate = parseDateKeyToMalaysiaDate('2026-10-24');
    }
  } else if (event.title.includes('Gotong-Royong') || event.title.includes('Lakeside Cleanup')) {
    startDate = new Date('2026-10-24T07:30:00+08:00');
    if (!customTimeString) customTimeString = 'Sat • 7:30 AM - 10:30 AM';
    if (!venue) venue = 'Elmina Central Lake & Lakeside Trail';
  } else if (event.title.includes('Recycling') || event.title.includes('E-Waste')) {
    startDate = new Date('2026-11-01T09:00:00+08:00');
    if (!customTimeString) customTimeString = 'Sun • 9:00 AM - 1:00 PM';
    if (!venue) venue = 'Elmina West Resident Hall';
  } else if (event.title.includes('Cycling') || event.title.includes('Twilight')) {
    startDate = new Date('2026-11-06T20:15:00+08:00');
    if (!customTimeString) customTimeString = 'Fri • 8:15 PM - 10:00 PM';
    if (!venue) venue = 'Elmina Rainbow Bridge Pavilion';
  } else {
    // Check if content has embedded date tags like [Date: 2026-10-25]
    const contentDateMatch = event.content?.match(/\[Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\]/i);
    const contentTimeMatch = event.content?.match(/\[Time:\s*([^\]]+)\]/i);
    const contentVenueMatch = event.content?.match(/\[Venue:\s*([^\]]+)\]/i);

    if (contentDateMatch) {
      startDate = parseDateKeyToMalaysiaDate(contentDateMatch[1]);
    } else {
      // Default to 7 days after creation
      const createdTime = new Date(event.createdAt).getTime();
      startDate = new Date((isNaN(createdTime) ? today.getTime() : createdTime) + 7 * 86400000);
    }

    if (contentTimeMatch && !customTimeString) {
      customTimeString = contentTimeMatch[1].trim();
    }
    if (contentVenueMatch && (!event.eventVenue || venue === 'Elmina Central Park')) {
      venue = contentVenueMatch[1].trim();
    }
  }

  // 2. Check explicit eventEndDate
  if (event.eventEndDate) {
    endDate = new Date(event.eventEndDate);
    if (isNaN(endDate.getTime())) {
      endDate = new Date(startDate.getTime() + 2 * 3600000); // 2h default
    }
  } else {
    // Check content for [EndDate: 2026-10-25]
    const contentEndDateMatch = event.content?.match(/\[EndDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\]/i);
    if (contentEndDateMatch) {
      endDate = parseDateKeyToMalaysiaDate(contentEndDateMatch[1]);
    } else {
      // Default duration: 2.5 hours after start
      endDate = new Date(startDate.getTime() + 2.5 * 3600000);
    }
  }

  const startDateKey = formatToMalaysiaDateKey(startDate);
  const endDateKey = formatToMalaysiaDateKey(endDate);
  const crossesMidnight = startDateKey !== endDateKey && (endDate.getTime() - startDate.getTime() < 24 * 3600000);
  const isMultiDay = startDateKey !== endDateKey;

  // Generate all dates spanned by this event
  const allDateKeys: string[] = [];
  const startDayTime = parseDateKeyToMalaysiaDate(startDateKey).getTime();
  const endDayTime = parseDateKeyToMalaysiaDate(endDateKey).getTime();

  for (let t = startDayTime; t <= endDayTime; t += 86400000) {
    allDateKeys.push(formatToMalaysiaDateKey(new Date(t)));
  }

  if (allDateKeys.length === 0) {
    allDateKeys.push(startDateKey);
  }

  // Month & Day numbers in Malaysia local time
  const monthFormatter = new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIMEZONE,
    month: 'short',
  });
  const dayFormatter = new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIMEZONE,
    day: 'numeric',
  });
  const weekdayFormatter = new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIMEZONE,
    weekday: 'short',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const monthShort = monthFormatter.format(startDate).toUpperCase();
  const dayNumber = dayFormatter.format(startDate);
  const weekdayShort = weekdayFormatter.format(startDate);

  let timeString = customTimeString;
  if (!timeString) {
    const startHourStr = timeFormatter.format(startDate);
    const endHourStr = timeFormatter.format(endDate);
    if (crossesMidnight) {
      timeString = `${weekdayShort} • ${startHourStr} - ${endHourStr} (+1 day)`;
    } else if (isMultiDay) {
      timeString = `${startHourStr} - ${endHourStr} (Multi-Day)`;
    } else {
      timeString = `${weekdayShort} • ${startHourStr} - ${endHourStr}`;
    }
  }

  let scheduleString = `${weekdayShort}, ${dayNumber} ${monthShort}`;
  if (isMultiDay) {
    const endDayNum = dayFormatter.format(endDate);
    const endMonthShort = monthFormatter.format(endDate).toUpperCase();
    scheduleString = `${dayNumber} ${monthShort} - ${endDayNum} ${endMonthShort}`;
  }

  // An event is upcoming if its end date/time is greater than or equal to today's start
  const todayKey = formatToMalaysiaDateKey(today);
  const isUpcoming = endDateKey >= todayKey || endDate.getTime() >= today.getTime() - 86400000;

  return {
    startDate,
    endDate,
    dateKey: startDateKey,
    endDateKey,
    allDateKeys,
    scheduleString,
    timeString,
    monthShort,
    dayNumber,
    venue,
    isMultiDay,
    crossesMidnight,
    isUpcoming,
  };
}

/**
 * Calculates calendar grid days for a given year and month (0-indexed).
 * Week starts on Sunday (index 0).
 * Accurately calculates leap years, month length, and padding cells for surrounding months.
 */
export function getCalendarGridDays(
  year: number,
  monthIndex: number,
  referenceToday?: Date
): CalendarDay[] {
  const today = referenceToday || getMalaysiaToday();
  const todayKey = formatToMalaysiaDateKey(today);

  // Total days in current month
  const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Day of week of the 1st of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

  // Days in previous month
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const days: CalendarDay[] = [];

  // 1. Padding days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, monthIndex - 1, dayNum);
    const dateKey = formatToMalaysiaDateKey(prevMonthDate);
    days.push({
      date: prevMonthDate,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isPast: dateKey < todayKey,
    });
  }

  // 2. Days of current month
  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const currentDate = new Date(year, monthIndex, dayNum);
    const dateKey = formatToMalaysiaDateKey(currentDate);
    days.push({
      date: currentDate,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      isPast: dateKey < todayKey,
    });
  }

  // 3. Padding days for next month to complete the grid (multiples of 7: 35 or 42)
  const totalCells = days.length <= 35 ? 35 : 42;
  const remainingCells = totalCells - days.length;

  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextMonthDate = new Date(year, monthIndex + 1, dayNum);
    const dateKey = formatToMalaysiaDateKey(nextMonthDate);
    days.push({
      date: nextMonthDate,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isPast: dateKey < todayKey,
    });
  }

  return days;
}

/**
 * Maps an array of CommunityPosts to a dictionary of date keys ('YYYY-MM-DD').
 * Multi-day events appear under each date key they span.
 * Events on the same day are sorted chronologically by start time.
 */
export function mapEventsToCalendarDays(
  events: CommunityPost[],
  referenceToday?: Date
): Map<string, { event: CommunityPost; schedule: ParsedEventSchedule }[]> {
  const map = new Map<string, { event: CommunityPost; schedule: ParsedEventSchedule }[]>();

  for (const event of events) {
    if (event.category !== 'event' || event.status !== 'active') continue;

    const schedule = parseEventSchedule(event, referenceToday);

    for (const key of schedule.allDateKeys) {
      const existing = map.get(key) || [];
      existing.push({ event, schedule });
      // Sort chronologically by start time
      existing.sort((a, b) => a.schedule.startDate.getTime() - b.schedule.startDate.getTime());
      map.set(key, existing);
    }
  }

  return map;
}

/**
 * Navigates months safely handling year boundaries (e.g. Dec -> Jan, Jan -> Dec).
 */
export function navigateMonth(date: Date, deltaMonths: number): Date {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  // Safe calculation using Date constructor
  return new Date(currentYear, currentMonth + deltaMonths, 1);
}
