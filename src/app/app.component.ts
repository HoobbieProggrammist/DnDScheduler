import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { BigDateOverlayComponent } from './big-date-overlay.component';
import { CalendarDay, PlayerSelection } from './shared/types';

@Component({
  selector: 'app-root',
  imports: [CommonModule, BigDateOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'dnd-scheduler';
  calendarDays: CalendarDay[] = [];
  
  // Modal state
  isModalOpen = false;
  selectedDate: CalendarDay | null = null;
  
  // Player options (Raffaele first, then alphabetical)
  players = ['Raffaele', 'Alessandro', 'Federico', 'Samuele', 'Vincenzo'];
  
  // Track selections for each date and player
  playerSelections: PlayerSelection = {};
  
  // Loading state
  isLoading = true;

  constructor(private supabaseService: SupabaseService) {
    this.generateCalendarDays();
  }

  async ngOnInit() {
    // Initialize database and load data
    await this.supabaseService.initializeDatabase();
    await this.loadPlayerSelections();
    this.isLoading = false;
  }

  private generateCalendarDays(): void {
    const today = new Date();
    const days: CalendarDay[] = [];

    for (let i = 0; i < 14; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      
      const dayName = currentDate.toLocaleDateString('it-IT', { weekday: 'short' });
      const monthName = currentDate.toLocaleDateString('it-IT', { month: 'short' });
      const dayNumber = currentDate.getDate();
      const isToday = i === 0;
      const isWeekStart = currentDate.getDay() === 1; // Monday is start of week (1)
      const dateKey = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      days.push({
        date: currentDate,
        dayName,
        dayNumber,
        monthName,
        isToday,
        isWeekStart,
        dateKey
      });

      // Initialize player selections for this date
      if (!this.playerSelections[dateKey]) {
        this.playerSelections[dateKey] = {};
        this.players.forEach(player => {
          this.playerSelections[dateKey][player] = false;
        });
      }
    }

    this.calendarDays = days;
  }

  private async loadPlayerSelections(): Promise<void> {
    try {
      const selections = await this.supabaseService.getPlayerSelections();
      
      // Reset all selections to false first
      this.calendarDays.forEach(day => {
        this.players.forEach(player => {
          this.playerSelections[day.dateKey][player] = false;
        });
      });
      
      // Apply loaded selections
      selections.forEach(selection => {
        if (this.playerSelections[selection.date_key]) {
          this.playerSelections[selection.date_key][selection.player_name] = selection.is_selected;
        }
      });
    } catch (error) {
      console.error('Error loading player selections:', error);
    }
  }

  openModal(day: CalendarDay): void {
    this.selectedDate = day;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedDate = null;
  }

  async togglePlayer(playerName: string): Promise<void> {
    if (this.selectedDate) {
      const dateKey = this.selectedDate.dateKey;
      const newValue = !this.playerSelections[dateKey][playerName];
      
      // Optimistically update the UI
      this.playerSelections[dateKey][playerName] = newValue;
      
      // Save to database
      const success = await this.supabaseService.upsertPlayerSelection(dateKey, playerName, newValue);
      
      if (!success) {
        // Revert the change if database update failed
        this.playerSelections[dateKey][playerName] = !newValue;
        console.error('Failed to save player selection');
      }
      
      // Close the modal after selection
      this.closeModal();
    }
  }

  isPlayerSelected(playerName: string): boolean {
    if (this.selectedDate) {
      const dateKey = this.selectedDate.dateKey;
      return this.playerSelections[dateKey][playerName] || false;
    }
    return false;
  }

  getSelectedPlayersCount(day: CalendarDay): number {
    const dateKey = day.dateKey;
    return this.players.filter(player => this.playerSelections[dateKey][player]).length;
  }

  // Check if a date has all 5 players selected
  hasAllPlayersSelected(day: CalendarDay): boolean {
    return this.getSelectedPlayersCount(day) === 5;
  }

  // Get the closest date that has all players selected (if any)
  getClosestFullySelectedDate(): CalendarDay | null {
    return this.calendarDays.find(day => this.hasAllPlayersSelected(day)) || null;
  }

  // Check if we should show the overlay with the closest fully selected date
  shouldShowDateOverlay(): boolean {
    return this.getClosestFullySelectedDate() !== null;
  }

  // Get LED states for a date (5 LEDs, lit based on selection count)
  getLedStates(day: CalendarDay): boolean[] {
    const selectedCount = this.getSelectedPlayersCount(day);
    return Array.from({ length: 5 }, (_, index) => index < selectedCount);
  }

  // Handle date click from the big date overlay component
  onOverlayDateClick(day: CalendarDay): void {
    this.openModal(day);
  }
}
