-- Add story_data column to storyboards table
-- This column stores the original user input from Step 1

ALTER TABLE storyboards 
ADD COLUMN IF NOT EXISTS story_data jsonb;

-- Add comment for documentation
COMMENT ON COLUMN storyboards.story_data IS 'Original user input data from Step 1 including original text, characters info, dramatic turning point, future vision, learnings, total scenes, and settings';

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'storyboards' 
AND column_name = 'story_data';