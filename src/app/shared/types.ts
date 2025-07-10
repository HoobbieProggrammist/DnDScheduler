export interface CalendarDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isWeekStart: boolean;
  dateKey: string;
}

export interface PlayerSelection {
  [dateKey: string]: {
    [playerName: string]: boolean;
  };
} 