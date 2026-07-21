-- 채팅 write-side: 클럽방 유일성 + last_message_at 트리거 + 백필
set search_path = si_mvp, public, extensions;

-- 1. 클럽당 채팅방 1개 보장 (type='club' 부분 유니크)
create unique index if not exists h_idx_chat_rooms_club_unique
  on h_chat_rooms (club_id)
  where type = 'club';

-- 2. 메시지 INSERT 시 해당 방의 last_message_at 갱신.
--    브라우저(anon+JWT)가 insert하므로 SECURITY DEFINER로 소유자 권한에서 갱신.
create or replace function fn_touch_chat_room_last_message()
returns trigger
language plpgsql
security definer
set search_path = si_mvp, public
as $$
begin
  update h_chat_rooms
    set last_message_at = new.created_at
    where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_chat_room_last_message on h_chat_messages;
create trigger trg_touch_chat_room_last_message
  after insert on h_chat_messages
  for each row
  execute function fn_touch_chat_room_last_message();

-- 3. 백필: 기존 클럽에 채팅방 생성 + active 멤버 room membership (재실행 안전)
insert into h_chat_rooms (id, type, name, club_id, created_at)
  select gen_random_uuid()::text, 'club', c.name, c.id, now()
  from h_clubs c
  where not exists (
    select 1 from h_chat_rooms r where r.club_id = c.id and r.type = 'club'
  );

insert into h_chat_room_members (room_id, user_id, joined_at)
  select r.id, cm.user_id, now()
  from h_club_members cm
  join h_chat_rooms r on r.club_id = cm.club_id and r.type = 'club'
  where cm.status = 'active'
  on conflict (room_id, user_id) do nothing;
