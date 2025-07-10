import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BigDateOverlayComponent } from './big-date-overlay.component';
import { SupabaseService } from './supabase.service';
import { CalendarDay, PlayerSelection, Group } from './shared/types';

@Component({
  selector: 'app-group-container',
  imports: [CommonModule, BigDateOverlayComponent],
  template: `
    <div class="group-container">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Caricamento gruppo...</div>
      </div>



              <!-- Main Calendar App -->
        <div *ngIf="!isLoading" class="calendar-container">
        <h1>
          {{ shouldShowDateOverlay() ? "S'PAZEAA" : "DnD pazzo napoli quando?" }}
        </h1>
        <div class="group-info">
          <span class="group-name">{{ currentGroup?.name }}</span>
        </div>
        
        <!-- Date Overlay Component (when closest date has all 5 players) -->
        <app-big-date-overlay 
          *ngIf="shouldShowDateOverlay()" 
          [selectedDate]="getClosestFullySelectedDate()"
          (dateClicked)="onOverlayDateClick($event)">
        </app-big-date-overlay>

        <!-- Normal Calendar Grid (always visible) -->
        <div class="calendar-grid">
          <!-- First Row (Days 1-7) -->
          <div class="calendar-row">
            <div *ngFor="let day of calendarDays.slice(0, 7); let i = index" 
                 class="day-square" 
                 [class.today]="day.isToday"
                 [class.week-start]="day.isWeekStart"
                 (click)="openModal(day)">
              <div class="day-name">{{ day.dayName }}</div>
              <div class="day-number">{{ day.dayNumber }}</div>
              <div class="month-name">{{ day.monthName }}</div>
              
              <!-- 5 LED indicators instead of number -->
              <div class="date-leds" *ngIf="getSelectedPlayersCount(day) > 0">
                <div *ngFor="let isLit of getLedStates(day)" 
                     class="date-led" 
                     [class.date-led-on]="isLit"
                     [class.date-led-off]="!isLit">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Second Row (Days 8-14) -->
          <div class="calendar-row">
            <div *ngFor="let day of calendarDays.slice(7, 14); let i = index" 
                 class="day-square" 
                 [class.today]="day.isToday"
                 [class.week-start]="day.isWeekStart"
                 (click)="openModal(day)">
              <div class="day-name">{{ day.dayName }}</div>
              <div class="day-number">{{ day.dayNumber }}</div>
              <div class="month-name">{{ day.monthName }}</div>
              
              <!-- 5 LED indicators instead of number -->
              <div class="date-leds" *ngIf="getSelectedPlayersCount(day) > 0">
                <div *ngFor="let isLit of getLedStates(day)" 
                     class="date-led" 
                     [class.date-led-on]="isLit"
                     [class.date-led-off]="!isLit">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" *ngIf="isModalOpen" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ selectedDate?.dayName }} {{ selectedDate?.dayNumber }} {{ selectedDate?.monthName }}</h2>
              <button class="close-button" (click)="closeModal()">×</button>
            </div>
            
            <div class="modal-body">
              <h3>Chi partecipa?</h3>
              <div class="players-list">
                <div *ngFor="let player of players" 
                     class="player-option" 
                     (click)="togglePlayer(player)">
                  <div class="led-indicator" 
                       [class.led-on]="isPlayerSelected(player)"
                       [class.led-off]="!isPlayerSelected(player)">
                  </div>
                  <span class="player-name">{{ player }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './group-container.component.css'
})
export class GroupContainerComponent implements OnInit {
  groupSlug = '';
  currentGroup: Group | null = null;
  isLoading = true;
  showRegistration = false;
  
  // Calendar state (copied from original AppComponent)
  calendarDays: CalendarDay[] = [];
  isModalOpen = false;
  selectedDate: CalendarDay | null = null;
  players: string[] = [];
  playerSelections: PlayerSelection = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    this.generateCalendarDays();
  }

  async ngOnInit() {
    // Get group slug from route
    this.route.paramMap.subscribe(async params => {
      this.groupSlug = params.get('groupSlug') || 'default';
      await this.loadOrCreateGroup();
    });
  }

  private async loadOrCreateGroup() {
    this.isLoading = true;
    
    try {
      // Initialize database
      await this.supabaseService.initializeDatabase();
      
      let group: Group | null = null;
      
      // Try to load from database first
      if (this.groupSlug !== 'default') {
        group = await this.supabaseService.getGroupBySlug(this.groupSlug);
      }
      
      // Fallback to localStorage if not found in database
      if (!group) {
        group = this.loadGroupFromStorageBySlug(this.groupSlug);
      }
      
      if (group) {
        // Group found (from database or localStorage)
        this.currentGroup = group;
        this.players = this.currentGroup.participants;
        await this.loadPlayerSelections();
      } else if (this.groupSlug === 'default') {
        // Default group
        this.currentGroup = {
          id: 'default',
          name: 'Gruppo Default',
          slug: 'default',
          participants: ['Raffaele', 'Alessandro', 'Federico', 'Samuele', 'Vincenzo'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.players = this.currentGroup.participants;
        await this.loadPlayerSelections();
      } else {
        // Group not found, redirect to register
        this.router.navigate(['/register']);
        return;
      }
    } catch (error) {
      console.error('Error loading group:', error);
      this.router.navigate(['/register']);
      return;
    }
    
    this.isLoading = false;
  }



  // Calendar methods (copied from original AppComponent)
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
      const isWeekStart = currentDate.getDay() === 1;
      const dateKey = currentDate.toISOString().split('T')[0];
      
      days.push({
        date: currentDate,
        dayName,
        dayNumber,
        monthName,
        isToday,
        isWeekStart,
        dateKey
      });
    }

    this.calendarDays = days;
  }

  private initializePlayerSelections(): void {
    this.calendarDays.forEach(day => {
      if (!this.playerSelections[day.dateKey]) {
        this.playerSelections[day.dateKey] = {};
        this.players.forEach(player => {
          this.playerSelections[day.dateKey][player] = false;
        });
      }
    });
  }

  private async loadPlayerSelections(): Promise<void> {
    try {
      if (!this.currentGroup) return;
      
      // Load selections for this specific group
      const selections = await this.supabaseService.getPlayerSelections(this.currentGroup.id);
      
      // Reset all selections to false first
      this.calendarDays.forEach(day => {
        if (!this.playerSelections[day.dateKey]) {
          this.playerSelections[day.dateKey] = {};
        }
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
    if (this.selectedDate && this.currentGroup) {
      const dateKey = this.selectedDate.dateKey;
      const newValue = !this.playerSelections[dateKey][playerName];
      
      this.playerSelections[dateKey][playerName] = newValue;
      
      // Save to database with group context
      const success = await this.supabaseService.upsertPlayerSelection(
        this.currentGroup.id, 
        dateKey, 
        playerName, 
        newValue
      );
      
      if (!success) {
        this.playerSelections[dateKey][playerName] = !newValue;
        console.error('Failed to save player selection');
      }
      
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
    if (!this.playerSelections[dateKey]) return 0;
    return this.players.filter(player => this.playerSelections[dateKey][player]).length;
  }

  hasAllPlayersSelected(day: CalendarDay): boolean {
    return this.getSelectedPlayersCount(day) === this.players.length;
  }

  getClosestFullySelectedDate(): CalendarDay | null {
    return this.calendarDays.find(day => this.hasAllPlayersSelected(day)) || null;
  }

  shouldShowDateOverlay(): boolean {
    return this.getClosestFullySelectedDate() !== null;
  }

  getLedStates(day: CalendarDay): boolean[] {
    const selectedCount = this.getSelectedPlayersCount(day);
    return Array.from({ length: this.players.length }, (_, index) => index < selectedCount);
  }

  onOverlayDateClick(day: CalendarDay): void {
    this.openModal(day);
  }

  // LocalStorage helpers for group persistence
  private saveGroupToStorage(group: Group) {
    try {
      const groups = this.loadAllGroupsFromStorage();
      groups[group.slug] = group;
      localStorage.setItem('dnd-groups', JSON.stringify(groups));
    } catch (error) {
      console.error('Error saving group to localStorage:', error);
    }
  }

  private loadGroupFromStorageBySlug(groupSlug: string): Group | null {
    try {
      const groups = this.loadAllGroupsFromStorage();
      return groups[groupSlug] || null;
    } catch (error) {
      console.error('Error loading group from localStorage:', error);
      return null;
    }
  }

  private loadAllGroupsFromStorage(): { [key: string]: Group } {
    try {
      const stored = localStorage.getItem('dnd-groups');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error parsing groups from localStorage:', error);
      return {};
    }
  }
} 