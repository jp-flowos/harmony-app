-- Migrate chat from Firebase Realtime DB → Supabase Realtime.
-- Adds h_chat_messages table, RLS policies, and registers the table with
-- the supabase_realtime publication. Drops the now-unused firebase_room_id
-- column from h_chat_rooms.

set search_path = si_mvp, public, extensions;

-- 1. New messages table
create table if not exists h_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references h_chat_rooms(id) on delete cascade,
  sender_id text not null references h_profiles(id) on delete cascade,
  sender_nickname text not null,
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists h_idx_chat_messages_room_created
  on h_chat_messages(room_id, created_at);

-- 2. RLS — only room members can read / insert their own messages
alter table h_chat_messages enable row level security;

drop policy if exists "chat_messages_select" on h_chat_messages;
create policy "chat_messages_select" on h_chat_messages
  for select using (
    exists (
      select 1 from h_chat_room_members
      where h_chat_room_members.room_id = h_chat_messages.room_id
        and h_chat_room_members.user_id = auth.uid()::text
    )
  );

drop policy if exists "chat_messages_insert" on h_chat_messages;
create policy "chat_messages_insert" on h_chat_messages
  for insert with check (
    auth.uid()::text = sender_id
    and exists (
      select 1 from h_chat_room_members
      where h_chat_room_members.room_id = h_chat_messages.room_id
        and h_chat_room_members.user_id = auth.uid()::text
    )
  );

-- 3. Register with the realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'si_mvp'
      and tablename = 'h_chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table si_mvp.h_chat_messages';
  end if;
end $$;

-- 4. Drop the legacy Firebase pointer column
alter table h_chat_rooms drop column if exists firebase_room_id;
