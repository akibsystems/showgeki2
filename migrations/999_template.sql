-- ================================================================
-- Migration XXX: [マイグレーション名]
-- ================================================================
-- Description: [マイグレーションの詳細説明]
-- Author: [作成者名]
-- Date: [YYYY-MM-DD]
-- Dependencies: [依存するマイグレーション番号、なければNone]
-- ================================================================

-- [メインのマイグレーション処理]
DO $$
BEGIN
    -- [条件チェック例]
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'your_table_name'
    ) THEN
        -- [マイグレーション処理]
        
        RAISE NOTICE 'Successfully executed migration XXX';
    ELSE
        RAISE NOTICE 'Migration XXX already applied, skipping...';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Migration XXX failed: %', SQLERRM;
END
$$;

-- ================================================================
-- Verification
-- ================================================================

-- [マイグレーション結果の検証]
DO $$
BEGIN
    -- [検証処理例]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'your_table' 
        AND column_name = 'your_column'
    ) THEN
        RAISE NOTICE 'Verification: migration completed successfully';
    ELSE
        RAISE EXCEPTION 'Verification failed: expected changes not found';
    END IF;
END
$$;

-- ================================================================
-- Rollback Instructions (DO NOT EXECUTE)
-- ================================================================
-- To rollback this migration, execute the following SQL:
--
-- [ロールバック用のSQL文をコメントとして記載]
-- 
-- -- Verify rollback
-- [ロールバック確認用のSQL文]
-- ================================================================