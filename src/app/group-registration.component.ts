import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Group } from './shared/types';
import { SupabaseService } from './supabase.service';

@Component({
  selector: 'app-group-registration',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="registration-container">
      <div class="registration-card">
        <div class="registration-header">
          <h1>🎲 Nuovo Gruppo D&D!</h1>
          <p>Crea il tuo gruppo e aggiungi i partecipanti</p>
        </div>

        <div class="registration-form">
          <!-- Group Name -->
          <div class="form-group">
            <label for="groupName">Nome del Gruppo/Campagna</label>
            <input 
              type="text" 
              id="groupName"
              [(ngModel)]="groupName"
              (input)="onGroupNameChange()"
              placeholder="es. La Compagnia dell'Anello"
              class="form-input"
              [class.error]="groupNameError">
            <div class="error-message" *ngIf="groupNameError">{{ groupNameError }}</div>
          </div>

          <!-- Participants -->
          <div class="form-group">
            <label>Partecipanti (minimo 2, massimo 8)</label>
            
            <div class="participants-list">
              <div *ngFor="let participant of participants; let i = index; trackBy: trackByIndex" 
                   class="participant-row">
                <input 
                  type="text" 
                  [(ngModel)]="participants[i]"
                  (input)="onParticipantChange()"
                  [placeholder]="'Partecipante ' + (i + 1)"
                  class="participant-input"
                  [class.error]="participantErrors[i]"
                  [id]="'participant-' + i">
                <button 
                  type="button" 
                  class="remove-button"
                  (click)="removeParticipant(i)"
                  *ngIf="participants.length > 2">
                  ×
                </button>
              </div>
            </div>

            <button 
              type="button" 
              class="add-participant-button"
              (click)="addParticipant()"
              [disabled]="participants.length >= 8">
              + Aggiungi Partecipante
            </button>

            <div class="error-message" *ngIf="participantsError">{{ participantsError }}</div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button 
              type="button" 
              class="create-button"
              (click)="createGroup()"
              [disabled]="isCreating || !isFormValid()">
              <span *ngIf="!isCreating">Crea Gruppo</span>
              <span *ngIf="isCreating">Creazione in corso...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './group-registration.component.css'
})
export class GroupRegistrationComponent implements OnInit, OnDestroy {
  groupName = '';
  participants = ['', ''];
  isCreating = false;
  
  // Validation debouncing
  private validationTimeout: any;

  // Error states
  groupNameError = '';
  participantsError = '';
  participantErrors: string[] = ['', ''];

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    // Initialize form validation
    this.validateForm();
  }

  ngOnDestroy() {
    // Clean up validation timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
  }

  onGroupNameChange(): void {
    // Debounce validation to avoid frequent re-renders
    clearTimeout(this.validationTimeout);
    this.validationTimeout = setTimeout(() => this.validateForm(), 300);
  }

  onParticipantChange(): void {
    // Debounce validation to avoid frequent re-renders
    clearTimeout(this.validationTimeout);
    this.validationTimeout = setTimeout(() => this.validateForm(), 300);
  }

  addParticipant(): void {
    if (this.participants.length < 8) {
      this.participants.push('');
      this.participantErrors.push('');
      // Immediate validation for structural changes
      this.validateForm();
    }
  }

  removeParticipant(index: number): void {
    if (this.participants.length > 2) {
      this.participants.splice(index, 1);
      this.participantErrors.splice(index, 1);
      // Immediate validation for structural changes
      this.validateForm();
    }
  }

  private _isFormValid: boolean = false;

  isFormValid(): boolean {
    return this._isFormValid;
  }

  private validateForm(): void {
    this.clearErrors();
    let isValid = true;

    // Validate group name
    if (!this.groupName.trim()) {
      this.groupNameError = 'Il nome del gruppo è obbligatorio';
      isValid = false;
    } else if (this.groupName.trim().length < 3) {
      this.groupNameError = 'Il nome del gruppo deve avere almeno 3 caratteri';
      isValid = false;
    }

    // Validate participants
    const cleanParticipants = this.participants.map(p => p.trim()).filter(p => p);
    
    if (cleanParticipants.length < 2) {
      this.participantsError = 'Servono almeno 2 partecipanti';
      isValid = false;
    }

    // Check for empty participant names in filled positions
    this.participants.forEach((participant, index) => {
      if (!participant.trim() && index < 2) {
        // Only require the first 2 participants
        this.participantErrors[index] = 'Nome obbligatorio';
        isValid = false;
      }
    });

    // Check for duplicate names (fixed logic)
    const lowerCaseNames = cleanParticipants.map(name => name.toLowerCase());
    const hasDuplicates = lowerCaseNames.some((name, index) => 
      lowerCaseNames.indexOf(name) !== index
    );
    
    if (hasDuplicates) {
      this.participantsError = 'I nomi dei partecipanti devono essere unici';
      isValid = false;
    }

    this._isFormValid = isValid;
  }

  clearErrors(): void {
    this.groupNameError = '';
    this.participantsError = '';
    // Don't recreate array - just clear existing values
    for (let i = 0; i < this.participantErrors.length; i++) {
      this.participantErrors[i] = '';
    }
  }

  createGroup(): void {
    this.validateForm();
    if (!this.isFormValid()) {
      return;
    }

    this.isCreating = true;
    
    const cleanParticipants = this.participants
      .map(p => p.trim())
      .filter(p => p);

    const groupName = this.groupName.trim();
    const groupSlug = this.generateSlug(groupName);
    const groupId = this.generateGroupId();

    // Create group object
    const group: Group = {
      id: groupId,
      name: groupName,
      slug: groupSlug,
      participants: cleanParticipants,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Simulate API call delay and save to database
    setTimeout(async () => {
      try {
        // Try to save to database first
        const dbSuccess = await this.supabaseService.createGroup(group);
        
        if (dbSuccess) {
          console.log('Group saved to database successfully');
        } else {
          console.log('Database save failed, using localStorage fallback');
        }
        
        // Always save to localStorage as fallback
        this.saveGroupToStorage(group);
        
        // Navigate to the new group
        this.router.navigate(['/group', groupSlug]);
        
      } catch (error) {
        console.error('Error saving group:', error);
        // Save to localStorage as fallback
        this.saveGroupToStorage(group);
        this.router.navigate(['/group', groupSlug]);
      }
      
      this.isCreating = false;
    }, 1000);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  private generateSlug(name: string): string {
    // Generate URL-friendly slug from group name
    let slug = name
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Handle duplicates by checking localStorage
    let finalSlug = slug;
    let counter = 1;
    while (this.loadGroupFromStorageBySlug(finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    
    return finalSlug;
  }

  private generateGroupId(): string {
    // Simple ID generation - in real app, use UUID or let backend generate
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // LocalStorage helpers
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