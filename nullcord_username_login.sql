-- Nullcord username/password login migration
-- Run this ONCE in Supabase Dashboard -> SQL Editor before switching users
-- to username-only login. It preserves each auth user ID and password.
--
-- New accounts use the internal alias username@login.nullcord.invalid.
-- Existing accounts are moved to the same alias based on profiles.username.
-- Real email addresses are no longer used by Nullcord login.

begin;

do $$
begin
  if exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.username !~ '^[a-z0-9_]{2,24}$'
  ) then
    raise exception 'A profile has an invalid username. Fix usernames to 2-24 lowercase letters, numbers, or underscores, then rerun.';
  end if;

  if exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    join auth.users other on lower(other.email) = lower(p.username || '@login.nullcord.invalid')
      and other.id <> u.id
  ) then
    raise exception 'A username login alias is already used by another auth account. Resolve that conflict before rerunning.';
  end if;
end $$;

update auth.users u
set
  email = lower(p.username) || '@login.nullcord.invalid',
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  updated_at = now()
from public.profiles p
where p.id = u.id
  and u.email is distinct from lower(p.username) || '@login.nullcord.invalid';

commit;

-- After this migration, disable email confirmation:
-- Supabase Dashboard -> Authentication -> Sign In / Providers -> Email
-- Turn OFF "Confirm email". Username login uses the internal alias address,
-- so no confirmation email is sent or required.
