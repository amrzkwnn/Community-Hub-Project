import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatToMalaysiaDateKey,
  parseDateKeyToMalaysiaDate,
  parseEventSchedule,
  getCalendarGridDays,
  mapEventsToCalendarDays,
  navigateMonth,
  formatMonthYearHeader,
} from '../src/lib/utils/eventDateUtils.ts';
import type { CommunityPost } from '../src/types/index.ts';

describe('TESDH Home Calendar & Event Engine', () => {
  it('correctly formats and parses dates in Malaysia timezone (Asia/Kuala_Lumpur)', () => {
    // 2026-10-24 07:30:00 +08:00
    const d = new Date('2026-10-24T07:30:00+08:00');
    const key = formatToMalaysiaDateKey(d);
    assert.strictEqual(key, '2026-10-24');

    const parsed = parseDateKeyToMalaysiaDate('2026-10-24');
    assert.strictEqual(formatToMalaysiaDateKey(parsed), '2026-10-24');
  });

  it('navigates across year boundaries seamlessly (Dec to Jan and Jan to Dec)', () => {
    const dec2026 = new Date(2026, 11, 1); // December 2026
    const jan2027 = navigateMonth(dec2026, 1);
    assert.strictEqual(jan2027.getFullYear(), 2027);
    assert.strictEqual(jan2027.getMonth(), 0); // January

    const jan2026 = new Date(2026, 0, 1); // January 2026
    const dec2025 = navigateMonth(jan2026, -1);
    assert.strictEqual(dec2025.getFullYear(), 2025);
    assert.strictEqual(dec2025.getMonth(), 11); // December
  });

  it('handles leap years correctly for February (2024 = 29 days, 2025 = 28 days, 2028 = 29 days)', () => {
    const feb2024Days = getCalendarGridDays(2024, 1); // Feb 2024
    const feb2024CurrentMonthDays = feb2024Days.filter((d) => d.isCurrentMonth);
    assert.strictEqual(feb2024CurrentMonthDays.length, 29);

    const feb2025Days = getCalendarGridDays(2025, 1); // Feb 2025
    const feb2025CurrentMonthDays = feb2025Days.filter((d) => d.isCurrentMonth);
    assert.strictEqual(feb2025CurrentMonthDays.length, 28);

    const feb2028Days = getCalendarGridDays(2028, 1); // Feb 2028
    const feb2028CurrentMonthDays = feb2028Days.filter((d) => d.isCurrentMonth);
    assert.strictEqual(feb2028CurrentMonthDays.length, 29);
  });

  it('aligns first day of month and generates full 35 or 42 grid cells', () => {
    // October 2026 starts on Thursday (index 4 in Sun-Sat)
    const oct2026Days = getCalendarGridDays(2026, 9);
    assert.ok(oct2026Days.length === 35 || oct2026Days.length === 42);

    const firstCurrentMonthDay = oct2026Days.find((d) => d.isCurrentMonth && d.dayNumber === 1);
    assert.ok(firstCurrentMonthDay);
    // There should be 4 padding days from September preceding Oct 1
    const oct1Index = oct2026Days.indexOf(firstCurrentMonthDay);
    assert.strictEqual(oct1Index, 4); // Thursday = index 4
  });

  it('correctly maps multi-day events to all spanned calendar dates', () => {
    const multiDayEvent: CommunityPost = {
      id: 'event-multiday-1',
      authorId: 'user-azman',
      authorName: 'Capt. (R) Azman Salleh',
      authorPrecinct: 'Township Management',
      authorRole: 'management',
      authorVerified: true,
      category: 'event',
      title: 'Elmina Eco-Living Community Weekend & Farmers Market',
      content: 'Two day sustainable living festival at central park.',
      isPinned: false,
      isAnonymous: false,
      upvotesCount: 10,
      repliesCount: 2,
      status: 'active',
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
      eventDate: '2026-10-24T08:00:00+08:00',
      eventEndDate: '2026-10-25T14:00:00+08:00',
      eventTime: 'Sat & Sun • 8:00 AM - 2:00 PM',
      eventVenue: 'Elmina Central Park Plaza',
    };

    const schedule = parseEventSchedule(multiDayEvent);
    assert.strictEqual(schedule.isMultiDay, true);
    assert.deepStrictEqual(schedule.allDateKeys, ['2026-10-24', '2026-10-25']);

    const map = mapEventsToCalendarDays([multiDayEvent]);
    assert.ok(map.has('2026-10-24'));
    assert.ok(map.has('2026-10-25'));
    assert.strictEqual(map.get('2026-10-24')?.length, 1);
    assert.strictEqual(map.get('2026-10-25')?.length, 1);
  });

  it('handles multiple events on the same date and sorts them by start time', () => {
    const earlyEvent: CommunityPost = {
      id: 'event-early',
      authorId: 'user-1',
      authorName: 'Resident 1',
      authorPrecinct: 'Elmina Green',
      authorRole: 'resident',
      authorVerified: true,
      category: 'event',
      title: 'Morning Yoga by the Lake',
      content: 'Early session',
      isPinned: false,
      isAnonymous: false,
      upvotesCount: 5,
      repliesCount: 0,
      status: 'active',
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
      eventDate: '2026-10-24T06:30:00+08:00',
    };

    const lateEvent: CommunityPost = {
      id: 'event-late',
      authorId: 'user-2',
      authorName: 'Resident 2',
      authorPrecinct: 'Elmina West',
      authorRole: 'resident',
      authorVerified: true,
      category: 'event',
      title: 'Afternoon Tree Planting',
      content: 'Afternoon session',
      isPinned: false,
      isAnonymous: false,
      upvotesCount: 8,
      repliesCount: 1,
      status: 'active',
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
      eventDate: '2026-10-24T15:00:00+08:00',
    };

    const map = mapEventsToCalendarDays([lateEvent, earlyEvent]); // Provided in reverse order
    const dayEvents = map.get('2026-10-24');
    assert.ok(dayEvents);
    assert.strictEqual(dayEvents.length, 2);
    // Early event should be sorted first
    assert.strictEqual(dayEvents[0].event.id, 'event-early');
    assert.strictEqual(dayEvents[1].event.id, 'event-late');
  });

  it('handles events crossing midnight', () => {
    const nightEvent: CommunityPost = {
      id: 'event-night',
      authorId: 'user-security',
      authorName: 'Security Team',
      authorPrecinct: 'Elmina Hub',
      authorRole: 'security',
      authorVerified: true,
      category: 'event',
      title: 'Stargazing & Midnight Trail Walk',
      content: 'Late night walk crossing into the next day.',
      isPinned: false,
      isAnonymous: false,
      upvotesCount: 12,
      repliesCount: 3,
      status: 'active',
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
      eventDate: '2026-10-24T22:30:00+08:00',
      eventEndDate: '2026-10-25T01:30:00+08:00',
    };

    const schedule = parseEventSchedule(nightEvent);
    assert.strictEqual(schedule.crossesMidnight, true);
    assert.ok(schedule.allDateKeys.includes('2026-10-24'));
    assert.ok(schedule.allDateKeys.includes('2026-10-25'));
  });

  it('formats month and year header correctly in Malaysia locale', () => {
    const oct2026 = new Date('2026-10-18T00:00:00+08:00');
    const header = formatMonthYearHeader(oct2026);
    assert.ok(header.toLowerCase().includes('october'));
    assert.ok(header.includes('2026'));
  });
});
