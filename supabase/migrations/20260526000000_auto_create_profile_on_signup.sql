-- Auto-create h_profiles row when a new auth.users row is inserted.
-- Reads nickname from raw_user_meta_data (set client-side via supabase.auth.signUp options.data).
-- Idempotent: re-running drops and recreates the trigger, on conflict do nothing on insert.

create or replace function si_mvp.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into si_mvp.h_profiles (id, nickname, region)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'nickname', '회원'),
    coalesce(new.raw_user_meta_data->>'region', '서울')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function si_mvp.handle_new_user();

-- Backfill: create profiles for any existing auth users that don't have one.
-- Note: auth.users.id is uuid while h_profiles.id is text, so we cast.
insert into si_mvp.h_profiles (id, nickname, region)
select
  u.id::text,
  coalesce(u.raw_user_meta_data->>'nickname', '회원'),
  '서울'
from auth.users u
left join si_mvp.h_profiles p on p.id = u.id::text
where p.id is null;
