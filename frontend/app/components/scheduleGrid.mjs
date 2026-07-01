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

export const getCourseSpanHeight = (slotTime, slotCourses, timeSlots) => {
  const startIdx = timeSlots.indexOf(slotTime);
  const furthestEndIdx = slotCourses.reduce((maxIdx, course) => {
    const endIdx = timeSlots.indexOf(formatTime(course.end_time));
    return endIdx > maxIdx ? endIdx : maxIdx;
  }, startIdx + 1);

  const span = furthestEndIdx > startIdx ? furthestEndIdx - startIdx : 1;
  return Math.max(span * 80 - 8, slotCourses.length * 56);
};