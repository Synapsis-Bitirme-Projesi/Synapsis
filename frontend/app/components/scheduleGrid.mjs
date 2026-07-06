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

export const getCourseSpanHeight = (slotTime, slotCourses = [], timeSlots = []) => {
  // Eğer timeSlots gelmediyse veya boş bir diziyse çökme, direkt varsayılan yükseklik dön
  if (!timeSlots || timeSlots.length === 0) {
    return slotCourses.length * 56 || 72;
  }

  const startIdx = timeSlots.indexOf(slotTime);

  // Eğer slotTime dizi içinde bulunamazsa startIdx -1 olur, bunu 0'a eşitleyelim güvenli olsun
  const safeStartIdx = startIdx === -1 ? 0 : startIdx;

  const furthestEndIdx = slotCourses.reduce((maxIdx, course) => {
    const endIdx = timeSlots.indexOf(formatTime(course?.end_time));
    return endIdx > maxIdx ? endIdx : maxIdx;
  }, safeStartIdx + 1);

  const span = furthestEndIdx > safeStartIdx ? furthestEndIdx - safeStartIdx : 1;
  return Math.max(span * 80 - 8, slotCourses.length * 56);
};