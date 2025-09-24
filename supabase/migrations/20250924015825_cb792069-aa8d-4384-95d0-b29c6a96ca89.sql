-- Add character_id to leaderboards table to track which character was used for each score
ALTER TABLE leaderboards ADD COLUMN character_id uuid REFERENCES characters(id);

-- Add index for better performance when querying by character
CREATE INDEX idx_leaderboards_character_id ON leaderboards(character_id);