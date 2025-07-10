import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Group } from './shared/types';

const SUPABASE_URL = 'https://gqocwinbkrtsbrykbxeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxb2N3aW5ia3J0c2JyeWtieGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyODYxMTMsImV4cCI6MjA2NTg2MjExM30.2kmvDPzNRv9UwWVBaxv21ushFaYy-FAKn5fUznCjgw4';

export interface PlayerSelection {
  id?: number;
  group_id: string;
  date_key: string;
  player_name: string;
  is_selected: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupParticipant {
  id?: number;
  group_id: string;
  participant_name: string;
  participant_order: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Create a new group
  async createGroup(group: Group): Promise<boolean> {
    try {
      // Insert group
      const { error: groupError } = await this.supabase
        .from('groups')
        .insert({
          id: group.id,
          name: group.name,
          slug: group.slug
        });

      if (groupError) {
        console.error('Error creating group:', groupError);
        return false;
      }

      // Insert participants
      const participants = group.participants.map((participant, index) => ({
        group_id: group.id,
        participant_name: participant,
        participant_order: index + 1
      }));

      const { error: participantError } = await this.supabase
        .from('group_participants')
        .insert(participants);

      if (participantError) {
        console.error('Error creating group participants:', participantError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createGroup:', error);
      return false;
    }
  }

  // Get group by slug
  async getGroupBySlug(slug: string): Promise<Group | null> {
    try {
      const { data: groupData, error: groupError } = await this.supabase
        .from('groups')
        .select('*')
        .eq('slug', slug)
        .single();

      if (groupError) {
        console.error('Error fetching group:', groupError);
        return null;
      }

      const { data: participantData, error: participantError } = await this.supabase
        .from('group_participants')
        .select('participant_name')
        .eq('group_id', groupData.id)
        .order('participant_order', { ascending: true });

      if (participantError) {
        console.error('Error fetching group participants:', participantError);
        return null;
      }

      return {
        id: groupData.id,
        name: groupData.name,
        slug: groupData.slug,
        participants: participantData.map(p => p.participant_name),
        created_at: groupData.created_at,
        updated_at: groupData.updated_at
      };
    } catch (error) {
      console.error('Error in getGroupBySlug:', error);
      return null;
    }
  }

  // Get all player selections for a group
  async getPlayerSelections(groupId?: string): Promise<PlayerSelection[]> {
    try {
      let query = this.supabase
        .from('player_selections')
        .select('*')
        .order('date_key', { ascending: true })
        .order('player_name', { ascending: true });

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;

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
  async upsertPlayerSelection(groupId: string, dateKey: string, playerName: string, isSelected: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('player_selections')
        .upsert({
          group_id: groupId,
          date_key: dateKey,
          player_name: playerName,
          is_selected: isSelected,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'group_id,date_key,player_name'
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

  // Get selections for a specific date and group
  async getSelectionsForDate(groupId: string, dateKey: string): Promise<{ [playerName: string]: boolean }> {
    try {
      const { data, error } = await this.supabase
        .from('player_selections')
        .select('player_name, is_selected')
        .eq('group_id', groupId)
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

  // Initialize the database tables (call this once to set up the tables)
  async initializeDatabase(): Promise<void> {
    try {
      // Check if groups table exists
      const { error: groupsError } = await this.supabase
        .from('groups')
        .select('id')
        .limit(1);

      if (groupsError && groupsError.code === 'PGRST116') {
        console.log('Database tables do not exist. Please run the SQL schema from database-schema.sql in your Supabase dashboard.');
        console.log('You can find the complete schema in the database-schema.sql file in your project root.');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
} 