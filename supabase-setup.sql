-- S'Pazzeea DnD Scheduler Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create the player_selections table
CREATE TABLE IF NOT EXISTS player_selections (
    id SERIAL PRIMARY KEY,
    date_key VARCHAR(10) NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_key, player_name)
);

-- Create an index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_player_selections_date_key ON player_selections(date_key);

-- Create an index for better performance on player queries
CREATE INDEX IF NOT EXISTS idx_player_selections_player_name ON player_selections(player_name);

-- Enable Row Level Security (RLS)
ALTER TABLE player_selections ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows everyone to read and write
-- (In production, you might want to restrict this)
CREATE POLICY "Allow all access to player_selections" ON player_selections
    FOR ALL USING (true) WITH CHECK (true);

-- Insert some test data (optional)
INSERT INTO player_selections (date_key, player_name, is_selected) VALUES
('2024-12-19', 'Raffaele', true),
('2024-12-19', 'Alessandro', false),
('2024-12-19', 'Federico', true),
('2024-12-19', 'Samuele', false),
('2024-12-19', 'Vincenzo', true)
ON CONFLICT (date_key, player_name) DO NOTHING;

-- Verify the table was created successfully
SELECT * FROM player_selections ORDER BY date_key, player_name; 