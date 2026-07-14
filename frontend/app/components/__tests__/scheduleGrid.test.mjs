import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScheduleGrid, getCourseSpanHeight } from '../scheduleGrid.mjs';

const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

test('buildScheduleGrid keeps same-course overlaps in the same slot', () => {
  const courses = [
    {
      id: 1,
      course_name: 'Algorithms',
      course_code: 'CSE301',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '10:00',
    },
    {
      id: 2,
      course_name: 'Algorithms',
      course_code: 'CSE301',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '09:00',
    },
  ];

  const grid = buildScheduleGrid(courses);

  assert.equal(grid[1]['08:00'].length, 2);
  assert.deepEqual(grid[1]['08:00'].map((course) => course.id), [1, 2]);
});

test('buildScheduleGrid keeps cross-course overlaps in the same slot', () => {
  const courses = [
    {
      id: 10,
      course_name: 'Databases',
      course_code: 'CSE220',
      day_of_week: 3,
      start_time: '11:00',
      end_time: '13:00',
    },
    {
      id: 11,
      course_name: 'Operating Systems',
      course_code: 'CSE310',
      day_of_week: 3,
      start_time: '11:00',
      end_time: '12:00',
    },
  ];

  const grid = buildScheduleGrid(courses);

  assert.equal(grid[3]['11:00'].length, 2);
  assert.deepEqual(grid[3]['11:00'].map((course) => course.course_name), ['Databases', 'Operating Systems']);
});

test('getCourseSpanHeight follows duration for side-by-side overlaps', () => {
  const courses = [
    {
      id: 21,
      course_name: 'Graphics',
      course_code: 'CSE330',
      day_of_week: 2,
      start_time: '09:00',
      end_time: '11:00',
    },
    {
      id: 22,
      course_name: 'Networks',
      course_code: 'CSE340',
      day_of_week: 2,
      start_time: '09:00',
      end_time: '10:00',
    },
  ];

  // 09:00-11:00 spans 2 slots => 2 * 80 - 8 = 152
  // Overlaps share width, so height is duration-based only.
  const height = getCourseSpanHeight('09:00', courses, timeSlots);

  assert.equal(height, 152);
});

test('getCourseSpanHeight keeps single-hour overlaps inside one row', () => {
  const courses = [
    {
      id: 31,
      course_name: 'TEST',
      course_code: 'CSE101',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '09:00',
    },
    {
      id: 32,
      course_name: 'AYT',
      course_code: 'CSE102',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '09:00',
    },
  ];

  const height = getCourseSpanHeight('08:00', courses, timeSlots);

  assert.equal(height, 72);
});