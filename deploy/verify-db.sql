-- Compare the source practice database with the restored VPS database.
--
-- Local:
--   docker compose -f docker-compose.dev.yml exec -T postgres \
--     psql -U postgres -d dsa_software -f - < deploy/verify-db.sql
--
-- VPS:
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f -' < deploy/verify-db.sql
--
-- The counts must match, and the problems checksum must match. Problem IDs are
-- UUIDs generated at first seed, so the checksum is the identity check.

\pset pager off

select 'problems' as table_name, count(*) as rows from problems
union all select 'problem_examples', count(*) from problem_examples
union all select 'problem_testcases', count(*) from problem_testcases
union all select 'problem_starter_code', count(*) from problem_starter_code
union all select 'drafts', count(*) from drafts
union all select 'problem_progress', count(*) from problem_progress
union all select 'submissions', count(*) from submissions
union all select 'submission_cases', count(*) from submission_cases
union all select 'review_cards', count(*) from review_cards
union all select 'review_logs', count(*) from review_logs
union all select 'chat_threads', count(*) from chat_threads
union all select 'chat_messages', count(*) from chat_messages
union all select 'legacy_accepted', count(*) from legacy_accepted
order by table_name;

select
  count(*) as problems,
  coalesce(md5(string_agg(id::text, ',' order by id)), 'empty') as problem_ids
from problems;

select
  count(*) filter (where status = 'solved') as solved,
  count(*) filter (where solved_at is not null) as solved_at_rows
from problem_progress;
