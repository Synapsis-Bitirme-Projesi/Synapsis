import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  timeToMinutes,
  formatClock,
  getScheduleDayOfWeek,
  findActiveLecture,
} = await import(pathToFileURL(path.join(__dirname, 'activeLecture.runtime.mjs')).href);

test('timeToMinutes parses HH:MM and HH:MM:SS', () => {
  assert.equal(timeToMinutes('08:00'), 8 * 60);
  assert.equal(timeToMinutes('08:00:00'), 8 * 60);
  assert.equal(timeToMinutes('09:30'), 9 * 60 + 30);
  assert.equal(timeToMinutes('bad'), null);
});

test('getScheduleDayOfWeek maps Mon-Fri and skips weekend', () => {
  // 2026-07-13 is a Monday
  assert.equal(getScheduleDayOfWeek(new Date(2026, 6, 13, 10, 0, 0)), 1);
  // 2026-07-18 is a Saturday
  assert.equal(getScheduleDayOfWeek(new Date(2026, 6, 18, 10, 0, 0)), null);
  // 2026-07-19 is a Sunday
  assert.equal(getScheduleDayOfWeek(new Date(2026, 6, 19, 10, 0, 0)), null);
});

test('findActiveLecture returns Math101 during 08:00-09:00 Monday', () => {
  const courses = [
    {
      course_name: 'Math101',
      course_code: 'MATH101',
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '09:00:00',
    },
    {
      course_name: 'Physics',
      day_of_week: 1,
      start_time: '10:00',
      end_time: '11:00',
    },
  ];

  const mondayMorning = new Date(2026, 6, 13, 8, 30, 0); // Mon 08:30
  const hit = findActiveLecture(courses, mondayMorning);
  assert.ok(hit);
  assert.equal(hit.courseName, 'Math101');
  assert.equal(hit.startTime, '08:00');
  assert.equal(hit.endTime, '09:00');

  const mondayLater = new Date(2026, 6, 13, 9, 0, 0); // exclusive end
  assert.equal(findActiveLecture(courses, mondayLater), null);

  const tuesday = new Date(2026, 6, 14, 8, 30, 0);
  assert.equal(findActiveLecture(courses, tuesday), null);
});

test('formatClock pads hours', () => {
  assert.equal(formatClock('8:05'), '08:05');
});
