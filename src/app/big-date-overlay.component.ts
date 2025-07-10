import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarDay } from './shared/types';

@Component({
  selector: 'app-big-date-overlay',
  imports: [CommonModule],
  template: `
    <div class="date-overlay" (click)="onDateClick()">
      <div class="mega-day-square" [class.today]="selectedDate?.isToday">
        <div class="mega-day-name">{{ selectedDate?.dayName }}</div>
        <div class="mega-day-number">{{ selectedDate?.dayNumber }}</div>
        <div class="mega-month-name">{{ selectedDate?.monthName }}</div>
        <div class="mega-celebration">🎲 SESSIONE CONFERMATA! 🎲</div>
      </div>
    </div>
  `,
  styleUrl: './big-date-overlay.component.css'
})
export class BigDateOverlayComponent {
  @Input() selectedDate: CalendarDay | null = null;
  @Output() dateClicked = new EventEmitter<CalendarDay>();

  onDateClick(): void {
    if (this.selectedDate) {
      this.dateClicked.emit(this.selectedDate);
    }
  }
} 