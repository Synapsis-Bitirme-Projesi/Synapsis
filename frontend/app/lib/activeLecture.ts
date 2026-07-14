export interface ScheduleCourse {
  id?: number;
  course_name?: string;
  name?: string;
  course_code?: string;
  day_of_week?: number | string;
  start_time?: string;
  end_time?: string;
  location?: string;
  color_code?: string;
}

export interface ActiveLecture {
  courseName: string;
  courseCode: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  dayOfWeek: number;
}

/** Normalize DB/API time values like "08:00:00" or "8:00" to minutes since midnight. */
export function timeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatClock(value?: string | null): string {
  const mins = timeToMinutes(value);
  if (mins === null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Synapsis schedule uses Monday=1 ... Friday=5 (see WeeklySchedule).
 * JS Date.getDay() uses Sunday=0 ... Saturday=6.
 */
export function getScheduleDayOfWeek(date: Date = new Date()): number | null {
  const jsDay = date.getDay(); // 0 Sun .. 6 Sat
  if (jsDay === 0 || jsDay === 6) return null; // weekend — no weekday lectures
  return jsDay; // Mon=1 .. Fri=5 matches schedule
}

export function getCourseDisplayName(course: ScheduleCourse): string {
  const name = String(course.course_name || course.name || '').trim();
  return name;
}

/**
 * Find lectures happening right now for the user's weekly schedule.
 * Inclusive start, exclusive end: 08:00–09:00 is active at 08:00..08:59.
 */
export function findActiveLectures(
  courses: ScheduleCourse[],
  now: Date = new Date(),
): ActiveLecture[] {
  const day = getScheduleDayOfWeek(now);
  if (day === null) return [];

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const seen = new Set<string>();
  const active: ActiveLecture[] = [];

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

/** Pick a single suggestion — first active lecture, or null. */
export function findActiveLecture(
  courses: ScheduleCourse[],
  now: Date = new Date(),
): ActiveLecture | null {
  const list = findActiveLectures(courses, now);
  return list[0] || null;
}
