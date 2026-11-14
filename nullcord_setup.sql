-- Nullcord v3 update: rerun this in Supabase -> SQL Editor to enable message editing/deletion and Discover.

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
alter table channels add column if not exists kind text not null default 'text';
alter table channels add column if not exists admin_only boolean not null default false;
alter table server_members add column if not exists role text not null default 'member';
alter table public.messages add column if not exists audio_url text;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.servers add column if not exists publicly_listed boolean not null default false;
create index if not exists servers_discoverable_created on public.servers(created_at desc) where publicly_listed;

-- storage buckets (public read)
insert into storage.buckets (id,name,public) values ('avatars','avatars',true) on conflict (id) do nothing;
insert into storage.buckets (id,name,public) values ('voice','voice',true) on conflict (id) do nothing;

drop policy if exists nc_avatars_read on storage.objects;
drop policy if exists nc_avatars_ins on storage.objects;
drop policy if exists nc_avatars_upd on storage.objects;
drop policy if exists nc_voice_read on storage.objects;
drop policy if exists nc_voice_ins on storage.objects;
create policy nc_avatars_read on storage.objects for select using (bucket_id='avatars');
create policy nc_avatars_ins on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy nc_avatars_upd on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy nc_voice_read on storage.objects for select using (bucket_id='voice');
create policy nc_voice_ins on storage.objects for insert to authenticated with check (bucket_id='voice' and (storage.foldername(name))[1]=auth.uid()::text);

-- helper: is user staff (owner/admin/mod) of a server
create or replace function nc_is_staff(p_server uuid, p_user uuid) returns boolean
language sql security definer set search_path=public as $$
  select exists(select 1 from servers where id=p_server and owner_id=p_user)
      or exists(select 1 from server_members where server_id=p_server and user_id=p_user and role in ('admin','mod'));
$$;
create or replace function nc_is_admin(p_server uuid, p_user uuid) returns boolean
language sql security definer set search_path=public as $$
  select exists(select 1 from servers where id=p_server and owner_id=p_user)
      or exists(select 1 from server_members where server_id=p_server and user_id=p_user and role='admin');
$$;

-- enforce "only staff can post" in restricted channels
create or replace function nc_check_post() returns trigger
language plpgsql security definer set search_path=public as $$
declare ch record;
begin
  if new.channel_id is not null then
    select server_id, admin_only, kind into ch from channels where id=new.channel_id;
    if ch.kind='voice' then raise exception 'You cannot post text in a voice channel'; end if;
    if ch.admin_only and not nc_is_staff(ch.server_id,new.user_id) then
      raise exception 'Only admins and mods can post in this channel';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists nc_check_post_trg on messages;
create trigger nc_check_post_trg before insert on messages for each row execute function nc_check_post();

-- channel management RPCs
create or replace function nullcord_create_channel(p_server uuid, p_name text, p_kind text default 'text') returns uuid
language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if not nc_is_admin(p_server,auth.uid()) then raise exception 'Only admins can create channels'; end if;
  insert into channels(server_id,name,kind,created_by) values (p_server,p_name,case when p_kind='voice' then 'voice' else 'text' end,auth.uid()) returning id into cid;
  return cid;
end $$;

create or replace function nullcord_update_channel(p_channel uuid, p_name text, p_admin_only boolean) returns void
language plpgsql security definer set search_path=public as $$
declare sid uuid;
begin
  select server_id into sid from channels where id=p_channel;
  if not nc_is_admin(sid,auth.uid()) then raise exception 'Only admins can change channel settings'; end if;
  update channels set name=p_name, admin_only=p_admin_only where id=p_channel;
end $$;

create or replace function nullcord_delete_channel(p_channel uuid) returns void
language plpgsql security definer set search_path=public as $$
declare sid uuid;
begin
  select server_id into sid from channels where id=p_channel;
  if not nc_is_admin(sid,auth.uid()) then raise exception 'Only admins can delete channels'; end if;
  delete from messages where channel_id=p_channel;
  delete from channels where id=p_channel;
end $$;

-- roles: owner can set admin/mod/member; admins can set mod/member
create or replace function nullcord_set_role(p_server uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if p_role not in ('admin','mod','member') then raise exception 'Bad role'; end if;
  if exists(select 1 from servers where id=p_server and owner_id=p_user) then raise exception 'Cannot change the owner'; end if;
  if p_role='admin' and not exists(select 1 from servers where id=p_server and owner_id=auth.uid()) then raise exception 'Only the owner can make admins'; end if;
  if not nc_is_admin(p_server,auth.uid()) then raise exception 'Only admins can change roles'; end if;
  update server_members set role=p_role where server_id=p_server and user_id=p_user;
end $$;

grant execute on function nullcord_create_channel(uuid,text,text), nullcord_update_channel(uuid,text,boolean), nullcord_delete_channel(uuid), nullcord_set_role(uuid,uuid,text) to authenticated;

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
grant update (body) on public.messages to authenticated;
grant delete on public.messages to authenticated;

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
