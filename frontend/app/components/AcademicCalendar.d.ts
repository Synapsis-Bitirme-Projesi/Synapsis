import React from 'react';

interface AcademicCalendarProps {
  isDarkMode: boolean;
  onExamClick?: ((exam: any) => void) | null;
  tasks?: any[];
}

declare const AcademicCalendar: React.FC<AcademicCalendarProps>;
export default AcademicCalendar;
