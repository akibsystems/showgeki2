-- Add stepN_input columns to workflows table
-- These columns will store the merged data from stepN_in and stepN_out for UI display

ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS step1_input JSONB,
ADD COLUMN IF NOT EXISTS step2_input JSONB,
ADD COLUMN IF NOT EXISTS step3_input JSONB,
ADD COLUMN IF NOT EXISTS step4_input JSONB,
ADD COLUMN IF NOT EXISTS step5_input JSONB,
ADD COLUMN IF NOT EXISTS step6_input JSONB,
ADD COLUMN IF NOT EXISTS step7_input JSONB;

-- Add comments for clarity
COMMENT ON COLUMN workflows.step1_input IS 'Merged input data for Step 1 UI display';
COMMENT ON COLUMN workflows.step2_input IS 'Merged input data for Step 2 UI display';
COMMENT ON COLUMN workflows.step3_input IS 'Merged input data for Step 3 UI display';
COMMENT ON COLUMN workflows.step4_input IS 'Merged input data for Step 4 UI display';
COMMENT ON COLUMN workflows.step5_input IS 'Merged input data for Step 5 UI display';
COMMENT ON COLUMN workflows.step6_input IS 'Merged input data for Step 6 UI display';
COMMENT ON COLUMN workflows.step7_input IS 'Merged input data for Step 7 UI display';

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'workflows' 
    AND column_name LIKE 'step%_input'
ORDER BY 
    column_name;