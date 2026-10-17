-- Messages (Z45): the time of a message is the real moment of writing, not the start of the transaction — several
-- messages written in one transaction (an automatic run, a test) keep their order ("posledná správa" is clear).
alter table public.messages alter column created_at set default clock_timestamp();
