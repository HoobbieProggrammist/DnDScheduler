-- D&D Scheduler Database Schema
-- For Supabase PostgreSQL

-- Groups table
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly version of the name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group participants table
CREATE TABLE group_participants (
    id BIGSERIAL PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    participant_order INTEGER NOT NULL, -- Order in the group (1, 2, 3, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, participant_name), -- No duplicate names in same group
    UNIQUE(group_id, participant_order) -- No duplicate order in same group
);

-- Player selections table (updated to support groups)
CREATE TABLE player_selections (
    id BIGSERIAL PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL, -- Format: YYYY-MM-DD
    player_name TEXT NOT NULL,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, date_key, player_name) -- One selection per player per date per group
);

-- Indexes for better performance
CREATE INDEX idx_groups_slug ON groups(slug);
CREATE INDEX idx_group_participants_group_id ON group_participants(group_id);
CREATE INDEX idx_player_selections_group_id_date ON player_selections(group_id, date_key);

-- RLS (Row Level Security) policies for Supabase
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_selections ENABLE ROW LEVEL SECURITY;

-- Allow read access to all groups (public)
CREATE POLICY "Groups are viewable by everyone" ON groups
    FOR SELECT USING (true);

-- Allow anyone to create groups
CREATE POLICY "Anyone can create groups" ON groups
    FOR INSERT WITH CHECK (true);

-- Allow read access to all group participants
CREATE POLICY "Group participants are viewable by everyone" ON group_participants
    FOR SELECT USING (true);

-- Allow anyone to add participants to groups
CREATE POLICY "Anyone can add participants to groups" ON group_participants
    FOR INSERT WITH CHECK (true);

-- Allow read access to all player selections
CREATE POLICY "Player selections are viewable by everyone" ON player_selections
    FOR SELECT USING (true);

-- Allow anyone to insert/update player selections
CREATE POLICY "Anyone can manage player selections" ON player_selections
    FOR ALL USING (true);

-- Function to create URL-friendly slug from group name
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(input_text, '[àáâãäå]', 'a', 'g'),
                '[èéêë]', 'e', 'g'
            ),
            '[^a-z0-9]+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate slug when group is created
CREATE OR REPLACE FUNCTION set_group_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.slug := generate_slug(NEW.name);
    
    -- Handle duplicate slugs by appending a number
    WHILE EXISTS (SELECT 1 FROM groups WHERE slug = NEW.slug AND id != NEW.id) LOOP
        NEW.slug := NEW.slug || '-' || extract(epoch from now())::integer;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_group_slug
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_slug();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_player_selections_updated_at
    BEFORE UPDATE ON player_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 