/** Runtime JS mirror of activeLecture.ts for node:test (no TS loader). */

export function timeToMinutes(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatClock(value) {
  const mins = timeToMinutes(value);
  if (mins === null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getScheduleDayOfWeek(date = new Date()) {
  const jsDay = date.getDay();
  if (jsDay === 0 || jsDay === 6) return null;
  return jsDay;
}

export function getCourseDisplayName(course) {
  return String(course.course_name || course.name || '').trim();
}

export function findActiveLectures(courses, now = new Date()) {
  const day = getScheduleDayOfWeek(now);
  if (day === null) return [];

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const seen = new Set();
  const active = [];

  for (const course of courses) {
    const courseDay = Number(course.day_of_week);
    if (!Number.isFinite(courseDay) || courseDay !== day) continue;

    const start = timeToMinutes(course.start_time);
    const end = timeToMinutes(course.end_time);
    if (start === null || end === null || end <= start) continue;
    if (nowMins < start || nowMins >= end) continue;

    const courseName = getCourseDisplayName(course);
    if (!courseName) continue;

    const key = courseName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    active.push({
      courseName,
      courseCode: course.course_code ? String(course.course_code) : null,
      startTime: formatClock(course.start_time),
      endTime: formatClock(course.end_time),
      location: course.location ? String(course.location) : null,
      dayOfWeek: courseDay,
    });
  }

  return active;
}

export function findActiveLecture(courses, now = new Date()) {
  const list = findActiveLectures(courses, now);
  return list[0] || null;
}
