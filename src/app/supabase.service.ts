import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gqocwinbkrtsbrykbxeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxb2N3aW5ia3J0c2JyeWtieGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyODYxMTMsImV4cCI6MjA2NTg2MjExM30.2kmvDPzNRv9UwWVBaxv21ushFaYy-FAKn5fUznCjgw4';

export interface PlayerSelection {
  id?: number;
  date_key: string;
  player_name: string;
  is_selected: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Get all player selections
  async getPlayerSelections(): Promise<PlayerSelection[]> {
    try {
      const { data, error } = await this.supabase
        .from('player_selections')
        .select('*')
        .order('date_key', { ascending: true })
        .order('player_name', { ascending: true });

      if (error) {
        console.error('Error fetching player selections:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPlayerSelections:', error);
      return [];
    }
  }

  // Update or insert a player selection
  async upsertPlayerSelection(dateKey: string, playerName: string, isSelected: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('player_selections')
        .upsert({
          date_key: dateKey,
          player_name: playerName,
          is_selected: isSelected,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date_key,player_name'
        });

      if (error) {
        console.error('Error upserting player selection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in upsertPlayerSelection:', error);
      return false;
    }
  }

  // Get selections for a specific date
  async getSelectionsForDate(dateKey: string): Promise<{ [playerName: string]: boolean }> {
    try {
      const { data, error } = await this.supabase
        .from('player_selections')
        .select('player_name, is_selected')
        .eq('date_key', dateKey);

      if (error) {
        console.error('Error fetching selections for date:', error);
        return {};
      }

      const selections: { [playerName: string]: boolean } = {};
      data?.forEach(selection => {
        selections[selection.player_name] = selection.is_selected;
      });

      return selections;
    } catch (error) {
      console.error('Error in getSelectionsForDate:', error);
      return {};
    }
  }

  // Initialize the database table (call this once to set up the table)
  async initializeDatabase(): Promise<void> {
    try {
      // First, check if table exists by trying to select from it
      const { error: selectError } = await this.supabase
        .from('player_selections')
        .select('id')
        .limit(1);

      if (selectError && selectError.code === 'PGRST116') {
        console.log('Table does not exist. Please create it manually in Supabase dashboard.');
        console.log(`
          CREATE TABLE player_selections (
            id SERIAL PRIMARY KEY,
            date_key VARCHAR(10) NOT NULL,
            player_name VARCHAR(50) NOT NULL,
            is_selected BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(date_key, player_name)
          );
        `);
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
} 