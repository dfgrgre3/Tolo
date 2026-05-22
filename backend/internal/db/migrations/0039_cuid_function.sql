-- ============================================================
-- Migration 0039: Optimize and Update CUID Function
-- Uses CREATE FUNCTION with IF NOT EXISTS to avoid
-- acquiring an AccessExclusiveLock on pg_proc at startup.
-- Also marks the function as IMMUTABLE so Postgres can
-- inline it in expressions and cache results.
-- ============================================================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_proc WHERE proname = 'cuid' AND pronamespace = 'public'::regnamespace
	) THEN
		CREATE FUNCTION public.cuid() RETURNS text AS $func$
		BEGIN
			RETURN (
				'c' ||
				to_char(extract(epoch from now())::bigint, 'FM0000000000000000') ||
				substring(md5(random()::text || clock_timestamp()::text) from 1 for 16)
			);
		END;
		$func$ LANGUAGE plpgsql IMMUTABLE;
	END IF;
END $$;

-- Refresh planner statistics so the query planner immediately
-- picks up any changes without waiting for auto-analyze.
ANALYZE;