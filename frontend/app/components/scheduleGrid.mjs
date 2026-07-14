export const formatTime = (time) => time?.slice(0, 5) || '';

export const buildScheduleGrid = (courseList) => {
  return courseList.reduce((grid, course) => {
    const dayKey = course.day_of_week;
    const timeKey = formatTime(course.start_time);

    if (!grid[dayKey]) {
      grid[dayKey] = {};
    }

    if (!grid[dayKey][timeKey]) {
      grid[dayKey][timeKey] = [];
    }

    grid[dayKey][timeKey].push(course);
    return grid;
  }, {});
};

const SLOT_HEIGHT = 80;
const BLOCK_GAP = 8;

export const getCourseSpanHeight = (slotTime, slotCourses = [], timeSlots = []) => {
  // Side-by-side overlap layout: height follows duration, not course count.
  if (!timeSlots || timeSlots.length === 0) {
    return SLOT_HEIGHT - BLOCK_GAP;
  }

  const startIdx = timeSlots.indexOf(slotTime);
  const safeStartIdx = startIdx === -1 ? 0 : startIdx;

  const furthestEndIdx = slotCourses.reduce((maxIdx, course) => {
    const endIdx = timeSlots.indexOf(formatTime(course?.end_time));
    return endIdx > maxIdx ? endIdx : maxIdx;
  }, safeStartIdx + 1);

  const span = furthestEndIdx > safeStartIdx ? furthestEndIdx - safeStartIdx : 1;
  return Math.max(span * SLOT_HEIGHT - BLOCK_GAP, SLOT_HEIGHT - BLOCK_GAP);
};