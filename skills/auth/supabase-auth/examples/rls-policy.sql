-- Enable RLS (deny-all until a policy exists), then allow owners to
-- read their own rows. (select auth.uid()) is evaluated once per query.
alter table public.notes enable row level security;

create policy "Owners can read their own notes"
  on public.notes for select
  to authenticated
  using ((select auth.uid()) = user_id);
