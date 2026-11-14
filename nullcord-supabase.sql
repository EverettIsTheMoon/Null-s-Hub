-- Nullcord schema for the existing Null's Hub Supabase project
-- Run this whole file once in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_]{2,24}$'),
 display_name text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 unique(sender_id,recipient_id),
 check(sender_id <> recipient_id)
);
create table if not exists public.friendships (
 user_id uuid not null references public.profiles(id) on delete cascade,
 friend_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,friend_id),
 check(user_id <> friend_id)
);
create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(),
 kind text not null default 'dm' check(kind='dm'),
 created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(conversation_id,user_id)
);
create table if not exists public.servers (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 40),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 invite_code text not null unique default encode(gen_random_bytes(6),'hex'),
 publicly_listed boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.servers add column if not exists publicly_listed boolean not null default false;
create table if not exists public.server_members (
 server_id uuid not null references public.servers(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(server_id,user_id)
);
create table if not exists public.channels (
 id uuid primary key default gen_random_uuid(),
 server_id uuid not null references public.servers(id) on delete cascade,
 name text not null check(length(name) between 1 and 40),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(),
 channel_id uuid references public.channels(id) on delete cascade,
 conversation_id uuid references public.conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(body) between 1 and 4000),
 audio_url text,
 created_at timestamptz not null default now(),
 edited_at timestamptz,
 check ((channel_id is not null)::int + (conversation_id is not null)::int = 1)
);
alter table public.messages add column if not exists audio_url text;
alter table public.messages add column if not exists edited_at timestamptz;
create index if not exists messages_channel_time on public.messages(channel_id,created_at);
create index if not exists messages_conversation_time on public.messages(conversation_id,created_at);
create index if not exists server_members_user on public.server_members(user_id);
create index if not exists servers_discoverable_created on public.servers(created_at desc) where publicly_listed;

-- SECURITY DEFINER membership helpers avoid recursive RLS checks on membership tables.
create or replace function public.nullcord_is_server_member(target_server uuid)
returns boolean
language sql stable security definer
set search_path = public
set row_security = off
as $nullcord_server_member$
 select exists(select 1 from public.server_members where server_id=target_server and user_id=auth.uid())
$nullcord_server_member$;
create or replace function public.nullcord_is_conversation_member(target_conversation uuid)
returns boolean
language sql stable security definer
set search_path = public
set row_security = off
as $nullcord_conversation_member$
 select exists(select 1 from public.conversation_members where conversation_id=target_conversation and user_id=auth.uid())
$nullcord_conversation_member$;

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles visible to signed in users" on public.profiles;
create policy "profiles visible to signed in users" on public.profiles for select to authenticated using(true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check(id=auth.uid());

drop policy if exists "participants read friend requests" on public.friend_requests;
create policy "participants read friend requests" on public.friend_requests for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists "send own friend requests" on public.friend_requests;
create policy "send own friend requests" on public.friend_requests for insert to authenticated with check(sender_id=auth.uid());
drop policy if exists "recipient updates requests" on public.friend_requests;
create policy "recipient updates requests" on public.friend_requests for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

drop policy if exists "users read own friendships" on public.friendships;
create policy "users read own friendships" on public.friendships for select to authenticated using(user_id=auth.uid() or friend_id=auth.uid());

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations for select to authenticated using(public.nullcord_is_conversation_member(id));
drop policy if exists "members read conversation membership" on public.conversation_members;
create policy "members read conversation membership" on public.conversation_members for select to authenticated using(public.nullcord_is_conversation_member(conversation_id));

drop policy if exists "server members read server" on public.servers;
create policy "server members read server" on public.servers for select to authenticated using(public.nullcord_is_server_member(id));
drop policy if exists "signed in users create servers" on public.servers;
create policy "signed in users create servers" on public.servers for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists "owner updates server" on public.servers;
create policy "owner updates server" on public.servers for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

drop policy if exists "members see server members" on public.server_members;
create policy "members see server members" on public.server_members for select to authenticated using(public.nullcord_is_server_member(server_id));
drop policy if exists "server owner adds first member" on public.server_members;
create policy "server owner adds first member" on public.server_members for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.servers s where s.id=server_id and s.owner_id=auth.uid()));

drop policy if exists "members read channels" on public.channels;
create policy "members read channels" on public.channels for select to authenticated using(public.nullcord_is_server_member(channels.server_id));
drop policy if exists "members create channels" on public.channels;
create policy "members create channels" on public.channels for insert to authenticated with check(created_by=auth.uid() and public.nullcord_is_server_member(channels.server_id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated using(
 (channel_id is not null and exists(select 1 from public.channels c join public.server_members sm on sm.server_id=c.server_id where c.id=messages.channel_id and sm.user_id=auth.uid()))
 or
 (conversation_id is not null and exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=auth.uid()))
);
drop policy if exists "members send messages" on public.messages;
create policy "members send messages" on public.messages for insert to authenticated with check(user_id=auth.uid() and (
 (channel_id is not null and exists(select 1 from public.channels c join public.server_members sm on sm.server_id=c.server_id where c.id=messages.channel_id and sm.user_id=auth.uid()))
 or
 (conversation_id is not null and exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=auth.uid()))
));
drop policy if exists "authors update own messages" on public.messages;
create policy "authors update own messages" on public.messages for update to authenticated
using (user_id=auth.uid() and (
 (channel_id is not null and exists(select 1 from public.channels c where c.id=messages.channel_id and public.nullcord_is_server_member(c.server_id)))
 or (conversation_id is not null and public.nullcord_is_conversation_member(messages.conversation_id))
))
with check (user_id=auth.uid() and (
 (channel_id is not null and exists(select 1 from public.channels c where c.id=messages.channel_id and public.nullcord_is_server_member(c.server_id)))
 or (conversation_id is not null and public.nullcord_is_conversation_member(messages.conversation_id))
));
drop policy if exists "authors delete own messages" on public.messages;
create policy "authors delete own messages" on public.messages for delete to authenticated
using (user_id=auth.uid() and (
 (channel_id is not null and exists(select 1 from public.channels c where c.id=messages.channel_id and public.nullcord_is_server_member(c.server_id)))
 or (conversation_id is not null and public.nullcord_is_conversation_member(messages.conversation_id))
));

drop trigger if exists nullcord_mark_message_edited_trg on public.messages;
create or replace function public.nullcord_guard_message_update()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.id is distinct from old.id
    or new.channel_id is distinct from old.channel_id
    or new.conversation_id is distinct from old.conversation_id
    or new.user_id is distinct from old.user_id
    or new.audio_url is distinct from old.audio_url
    or new.created_at is distinct from old.created_at
    or new.edited_at is distinct from old.edited_at then
  raise exception 'Only message text can be edited';
 end if;
 if new.body is distinct from old.body then new.edited_at=now(); end if;
 return new;
end $$;
drop trigger if exists nullcord_guard_message_update_trg on public.messages;
create trigger nullcord_guard_message_update_trg before update on public.messages
for each row execute function public.nullcord_guard_message_update();

-- Explicit browser-role grants; RLS above remains the access-control boundary.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.friend_requests to authenticated;
grant select on public.friendships to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant select, insert, update on public.servers to authenticated;
grant select, insert on public.server_members to authenticated;
grant select, insert on public.channels to authenticated;
grant select, insert on public.messages to authenticated;
grant update (body) on public.messages to authenticated;
grant delete on public.messages to authenticated;

create or replace function public.nullcord_start_dm(other_user uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
 if auth.uid() is null or other_user=auth.uid() then raise exception 'Invalid friend'; end if;
 if not exists(select 1 from friendships where user_id=auth.uid() and friend_id=other_user) then raise exception 'You can only DM friends'; end if;
 select c.id into cid from conversations c
 join conversation_members a on a.conversation_id=c.id and a.user_id=auth.uid()
 join conversation_members b on b.conversation_id=c.id and b.user_id=other_user
 limit 1;
 if cid is null then
  insert into conversations(kind) values('dm') returning id into cid;
  insert into conversation_members(conversation_id,user_id) values(cid,auth.uid()),(cid,other_user);
 end if;
 return cid;
end $$;

create or replace function public.nullcord_accept_friend(request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare sender uuid;
begin
 select sender_id into sender from friend_requests where id=request_id and recipient_id=auth.uid() and status='pending' for update;
 if sender is null then raise exception 'Request not found'; end if;
 update friend_requests set status='accepted' where id=request_id;
 insert into friendships(user_id,friend_id) values(auth.uid(),sender),(sender,auth.uid()) on conflict do nothing;
end $$;

create or replace function public.nullcord_create_server(server_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into servers(name,owner_id) values(trim(server_name),auth.uid()) returning id into sid;
 insert into server_members(server_id,user_id) values(sid,auth.uid());
 insert into channels(server_id,name,created_by) values(sid,'general',auth.uid());
 return sid;
end $$;

create or replace function public.nullcord_join_server(code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select id into sid from servers where invite_code=trim(code);
 if sid is null then raise exception 'Invite code not found'; end if;
 insert into server_members(server_id,user_id) values(sid,auth.uid()) on conflict do nothing;
 return sid;
end $$;

create or replace function public.nullcord_set_server_visibility(p_server uuid,p_publicly_listed boolean)
returns void language plpgsql security definer set search_path=public set row_security=off as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if p_publicly_listed is null then raise exception 'Choose a Discover visibility setting'; end if;
 update public.servers set publicly_listed=p_publicly_listed where id=p_server and owner_id=auth.uid();
 if not found then raise exception 'Only the server owner can change Discover visibility'; end if;
end $$;

create or replace function public.nullcord_discover_servers()
returns table(server_id uuid,server_name text,owner_id uuid,owner_name text,member_count bigint)
language sql stable security definer
set search_path=public
set row_security=off
as $nullcord_discover$
 select s.id,s.name,s.owner_id,coalesce(nullif(btrim(p.display_name),''),p.username),count(sm.user_id)::bigint
 from public.servers s
 join public.profiles p on p.id=s.owner_id
 left join public.server_members sm on sm.server_id=s.id
 where s.publicly_listed and auth.uid() is not null and s.owner_id<>auth.uid()
   and not exists(select 1 from public.server_members mine where mine.server_id=s.id and mine.user_id=auth.uid())
 group by s.id,p.display_name,p.username,s.created_at
 order by s.created_at desc
 limit 100
$nullcord_discover$;

create or replace function public.nullcord_join_public_server(p_server uuid)
returns uuid language plpgsql security definer set search_path=public set row_security=off as $$
declare sid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select id into sid from public.servers where id=p_server and publicly_listed;
 if sid is null then raise exception 'That server is not available in Discover'; end if;
 insert into public.server_members(server_id,user_id) values(sid,auth.uid()) on conflict do nothing;
 return sid;
end $$;

revoke all on function public.nullcord_set_server_visibility(uuid,boolean) from public, anon;
revoke all on function public.nullcord_discover_servers() from public, anon;
revoke all on function public.nullcord_join_public_server(uuid) from public, anon;
grant execute on function public.nullcord_set_server_visibility(uuid,boolean) to authenticated;
grant execute on function public.nullcord_discover_servers() to authenticated;
grant execute on function public.nullcord_join_public_server(uuid) to authenticated;

grant execute on function public.nullcord_is_server_member(uuid) to authenticated;
grant execute on function public.nullcord_is_conversation_member(uuid) to authenticated;\ngrant execute on function public.nullcord_start_dm(uuid) to authenticated;
grant execute on function public.nullcord_accept_friend(uuid) to authenticated;
grant execute on function public.nullcord_create_server(text) to authenticated;
grant execute on function public.nullcord_join_server(text) to authenticated;

-- Enable realtime updates for new chat messages.
do $$ begin
 alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
