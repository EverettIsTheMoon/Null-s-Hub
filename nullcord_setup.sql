-- Nullcord v2 setup: run this ONCE in Supabase -> SQL Editor, BEFORE using the new Nullcord.html

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
alter table channels add column if not exists kind text not null default 'text';
alter table channels add column if not exists admin_only boolean not null default false;
alter table server_members add column if not exists role text not null default 'member';
alter table messages add column if not exists audio_url text;

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
