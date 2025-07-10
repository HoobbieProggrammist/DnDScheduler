-- D&D Scheduler Database Migration
-- Run this instead of database-schema.sql if you have existing tables

-- First, let's check and create the groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default group if it doesn't exist (MUST come before foreign keys)
INSERT INTO groups (id, name, slug, created_at, updated_at)
VALUES ('default', 'Gruppo Default', 'default', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create group_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_participants (
    id BIGSERIAL PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    participant_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, participant_name),
    UNIQUE(group_id, participant_order)
);

-- Insert default group participants if they don't exist
INSERT INTO group_participants (group_id, participant_name, participant_order)
VALUES 
    ('default', 'Raffaele', 1),
    ('default', 'Alessandro', 2),
    ('default', 'Federico', 3),
    ('default', 'Samuele', 4),
    ('default', 'Vincenzo', 5)
ON CONFLICT (group_id, participant_name) DO NOTHING;

-- Check if player_selections table needs to be updated
-- First, check if group_id column exists
DO $$
BEGIN
    -- Add group_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'player_selections' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE player_selections ADD COLUMN group_id TEXT;
        
        -- Set default group_id for existing records
        UPDATE player_selections SET group_id = 'default' WHERE group_id IS NULL;
        
        -- Make group_id NOT NULL after setting defaults
        ALTER TABLE player_selections ALTER COLUMN group_id SET NOT NULL;
        
        -- Add foreign key constraint (now the default group exists)
        ALTER TABLE player_selections ADD CONSTRAINT fk_player_selections_group_id 
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop old unique constraint if it exists and add new one
DO $$
BEGIN
    -- Drop old constraint (this might fail if constraint name is different, that's ok)
    BEGIN
        ALTER TABLE player_selections DROP CONSTRAINT IF EXISTS player_selections_date_key_player_name_key;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Add new unique constraint
    BEGIN
        ALTER TABLE player_selections ADD CONSTRAINT player_selections_group_date_player_unique 
            UNIQUE(group_id, date_key, player_name);
    EXCEPTION
        WHEN duplicate_table THEN NULL;
    END;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_group_participants_group_id ON group_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_player_selections_group_id_date ON player_selections(group_id, date_key);

-- Enable RLS if not already enabled
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_selections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (these will only be created if they don't exist)
DO $$
BEGIN
    -- Groups policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Groups are viewable by everyone') THEN
        CREATE POLICY "Groups are viewable by everyone" ON groups FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Anyone can create groups') THEN
        CREATE POLICY "Anyone can create groups" ON groups FOR INSERT WITH CHECK (true);
    END IF;
    
    -- Group participants policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_participants' AND policyname = 'Group participants are viewable by everyone') THEN
        CREATE POLICY "Group participants are viewable by everyone" ON group_participants FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_participants' AND policyname = 'Anyone can add participants to groups') THEN
        CREATE POLICY "Anyone can add participants to groups" ON group_participants FOR INSERT WITH CHECK (true);
    END IF;
    
    -- Player selections policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_selections' AND policyname = 'Player selections are viewable by everyone') THEN
        CREATE POLICY "Player selections are viewable by everyone" ON player_selections FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_selections' AND policyname = 'Anyone can manage player selections') THEN
        CREATE POLICY "Anyone can manage player selections" ON player_selections FOR ALL USING (true);
    END IF;
END $$;

-- Create or replace the slug generation function
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(input_text, '[àáâãäå]', 'a', 'g'),
                        '[èéêë]', 'e', 'g'
                    ),
                    '[ìíîï]', 'i', 'g'
                ),
                '[òóôõö]', 'o', 'g'
            ),
            '[ùúûü]', 'u', 'g'
        )
    );
    RETURN lower(regexp_replace(result, '[^a-z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Create or replace the group slug trigger function
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

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_set_group_slug ON groups;
CREATE TRIGGER trigger_set_group_slug
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_slug();

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at if they don't exist
DROP TRIGGER IF EXISTS trigger_update_groups_updated_at ON groups;
CREATE TRIGGER trigger_update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_player_selections_updated_at ON player_selections;
CREATE TRIGGER trigger_update_player_selections_updated_at
    BEFORE UPDATE ON player_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing player_selections to use default group if they don't have a group_id
UPDATE player_selections 
SET group_id = 'default' 
WHERE group_id IS NULL OR group_id = '';

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Database migration completed successfully!';
    RAISE NOTICE 'Tables created/updated: groups, group_participants, player_selections';
    RAISE NOTICE 'Default group and participants have been set up.';
END $$; 