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

export interface Group {
  id: string;
  name: string;
  slug: string;
  participants: string[];
  created_at: string;
  updated_at: string;
}

export interface GroupParticipant {
  group_id: string;
  participant_name: string;
  created_at: string;
}

export interface GroupPlayerSelection {
  group_id: string;
  date_key: string;
  player_name: string;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
} 