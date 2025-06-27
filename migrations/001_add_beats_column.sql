-- ================================================================
-- Migration 001: Add beats column to stories table
-- ================================================================
-- Description: Add beats column to track the number of images/beats per story
-- Author: Claude
-- Date: 2024-12-26
-- Dependencies: None
-- ================================================================

-- Add beats column to stories table
-- This column stores the number of images/beats for each story (default: 5, range: 1-20)
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' 
        AND column_name = 'beats'
    ) THEN
        -- Add the column with constraints
        ALTER TABLE stories 
        ADD COLUMN beats INTEGER NOT NULL DEFAULT 5 
        CHECK (beats >= 1 AND beats <= 20);
        
        -- Add comment for documentation
        COMMENT ON COLUMN stories.beats IS 'Number of beats/images in the story (1-20, default: 5)';
        
        -- Update any existing stories to have the default beats value
        UPDATE stories SET beats = 5 WHERE beats IS NULL;
        
        RAISE NOTICE 'Successfully added beats column to stories table';
    ELSE
        RAISE NOTICE 'Column beats already exists in stories table, skipping...';
    END IF;
END
$$;

-- ================================================================
-- Verification
-- ================================================================

-- Verify the column was added correctly
DO $$
BEGIN
    -- Check column exists and has correct type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' 
        AND column_name = 'beats'
        AND data_type = 'integer'
    ) THEN
        RAISE NOTICE 'Verification: beats column exists with correct type';
    ELSE
        RAISE EXCEPTION 'Verification failed: beats column not found or incorrect type';
    END IF;
    
    -- Check constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%beats%'
    ) THEN
        RAISE NOTICE 'Verification: beats constraint exists';
    ELSE
        RAISE WARNING 'Verification: beats constraint may not exist';
    END IF;
END
$$;

-- ================================================================
-- Rollback Instructions (DO NOT EXECUTE)
-- ================================================================
-- To rollback this migration, execute the following SQL:
--
-- -- Remove the beats column and its constraints
-- ALTER TABLE stories DROP COLUMN IF EXISTS beats;
--
-- -- Verify rollback
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'stories' AND column_name = 'beats';
-- -- Should return no rows if rollback was successful
-- ================================================================