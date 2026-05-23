-- Harmony App schema for the shared Supabase project.
-- Add "si_mvp" to API Settings > Exposed schemas before querying it through
-- Supabase REST/client APIs.

create schema if not exists si_mvp;

grant usage on schema si_mvp to anon, authenticated, service_role;

alter default privileges in schema si_mvp grant select on tables to anon;
alter default privileges in schema si_mvp grant all on tables to authenticated, service_role;
alter default privileges in schema si_mvp grant all on routines to authenticated, service_role;
alter default privileges in schema si_mvp grant all on sequences to authenticated, service_role;

set search_path = si_mvp, public, extensions;

do $$ begin create type h_subscription_tier as enum ('free', 'premium'); exception when duplicate_object then null; end $$;
do $$ begin create type h_verification_type as enum ('real_name', 'face', 'activity', 'review'); exception when duplicate_object then null; end $$;
do $$ begin create type h_join_type as enum ('open', 'approval'); exception when duplicate_object then null; end $$;
do $$ begin create type h_member_role as enum ('owner', 'admin', 'member'); exception when duplicate_object then null; end $$;
do $$ begin create type h_member_status as enum ('active', 'banned'); exception when duplicate_object then null; end $$;
do $$ begin create type h_post_type as enum ('general', 'notice', 'review', 'photo'); exception when duplicate_object then null; end $$;
do $$ begin create type h_meeting_participant_status as enum ('joined', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type h_info_category as enum ('health', 'finance', 'travel', 'hobby', 'gov'); exception when duplicate_object then null; end $$;
do $$ begin create type h_community_category as enum ('free', 'health', 'travel', 'hobby', 'daily', 'review'); exception when duplicate_object then null; end $$;
do $$ begin create type h_chat_room_type as enum ('club', 'private', 'open'); exception when duplicate_object then null; end $$;
do $$ begin create type h_chat_request_status as enum ('pending', 'accepted', 'rejected', 'expired'); exception when duplicate_object then null; end $$;
do $$ begin create type h_report_target_type as enum ('user', 'post', 'comment', 'chat'); exception when duplicate_object then null; end $$;
do $$ begin create type h_report_status as enum ('pending', 'processed'); exception when duplicate_object then null; end $$;
do $$ begin create type h_activity_type as enum ('join_club', 'create_meeting', 'join_meeting', 'write_post', 'write_review', 'write_comment'); exception when duplicate_object then null; end $$;

create table if not exists h_profiles (
  id text primary key,
  nickname text not null,
  birth_year integer,
  region text not null,
  bio text,
  avatar_url text,
  photo_urls jsonb default '[]'::jsonb,
  is_verified boolean default false,
  subscription_tier h_subscription_tier default 'free',
  activity_score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists h_hobbies (
  id text primary key,
  name text not null,
  category text not null,
  icon text
);

create table if not exists h_user_hobbies (
  user_id text references h_profiles(id) on delete cascade,
  hobby_id text references h_hobbies(id) on delete cascade,
  primary key (user_id, hobby_id)
);

create table if not exists h_verification_badges (
  id text primary key,
  user_id text references h_profiles(id) on delete cascade,
  type h_verification_type not null,
  verified_at timestamptz default now()
);

create table if not exists h_places (
  id text primary key,
  name text not null,
  category text not null,
  lat text not null,
  lng text not null,
  description text,
  is_senior_recommended boolean default false,
  data_source text default 'kakao',
  created_by text references h_profiles(id),
  created_at timestamptz default now()
);

create table if not exists h_clubs (
  id text primary key,
  name text not null,
  category text not null,
  region text not null,
  description text not null,
  owner_id text references h_profiles(id),
  cover_image text,
  join_type h_join_type default 'open',
  member_count integer default 0,
  is_premium boolean default false,
  created_at timestamptz default now()
);

create table if not exists h_club_members (
  club_id text references h_clubs(id) on delete cascade,
  user_id text references h_profiles(id) on delete cascade,
  role h_member_role default 'member',
  joined_at timestamptz default now(),
  status h_member_status default 'active',
  primary key (club_id, user_id)
);

create table if not exists h_club_posts (
  id text primary key,
  club_id text references h_clubs(id) on delete cascade,
  user_id text references h_profiles(id),
  type h_post_type default 'general',
  content text not null,
  image_urls jsonb default '[]'::jsonb,
  like_count integer default 0,
  comment_count integer default 0,
  is_hidden boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists h_club_post_likes (
  post_id text references h_club_posts(id) on delete cascade,
  user_id text references h_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists h_club_comments (
  id text primary key,
  post_id text references h_club_posts(id) on delete cascade,
  user_id text references h_profiles(id),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists h_club_meetings (
  id text primary key,
  club_id text references h_clubs(id) on delete cascade,
  title text not null,
  date timestamptz not null,
  location text not null,
  location_lat text,
  location_lng text,
  place_id text references h_places(id),
  max_participants integer default 20,
  current_count integer default 0,
  description text,
  created_at timestamptz default now()
);

create table if not exists h_meeting_participants (
  meeting_id text references h_club_meetings(id) on delete cascade,
  user_id text references h_profiles(id) on delete cascade,
  status h_meeting_participant_status default 'joined',
  joined_at timestamptz default now(),
  primary key (meeting_id, user_id)
);

create table if not exists h_meeting_reviews (
  id text primary key,
  meeting_id text references h_club_meetings(id) on delete cascade,
  user_id text references h_profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text not null,
  image_urls jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists h_fortune_master (
  id text primary key,
  date text not null,
  zodiac text not null,
  content text not null,
  health_content text,
  money_content text,
  relation_content text
);

create table if not exists h_fortune_comments (
  id text primary key,
  fortune_id text references h_fortune_master(id) on delete cascade,
  user_id text references h_profiles(id),
  comment text not null,
  region text,
  created_at timestamptz default now()
);

create table if not exists h_info_contents (
  id text primary key,
  category h_info_category not null,
  title text not null,
  content text not null,
  summary_box text,
  tags jsonb default '[]'::jsonb,
  author text,
  view_count integer default 0,
  like_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists h_info_comments (
  id text primary key,
  content_id text references h_info_contents(id) on delete cascade,
  user_id text references h_profiles(id),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists h_community_posts (
  id text primary key,
  category h_community_category not null,
  user_id text references h_profiles(id),
  title text not null,
  content text not null,
  image_urls jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  like_count integer default 0,
  comment_count integer default 0,
  region text,
  created_at timestamptz default now()
);

create table if not exists h_community_likes (
  post_id text references h_community_posts(id) on delete cascade,
  user_id text references h_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists h_community_comments (
  id text primary key,
  post_id text references h_community_posts(id) on delete cascade,
  user_id text references h_profiles(id),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists h_chat_rooms (
  id text primary key,
  type h_chat_room_type not null,
  name text,
  club_id text references h_clubs(id) on delete cascade,
  created_at timestamptz default now(),
  last_message_at timestamptz,
  firebase_room_id text
);

create table if not exists h_chat_room_members (
  room_id text references h_chat_rooms(id) on delete cascade,
  user_id text references h_profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz,
  primary key (room_id, user_id)
);

create table if not exists h_chat_requests (
  id text primary key,
  from_user text references h_profiles(id),
  to_user text references h_profiles(id),
  status h_chat_request_status default 'pending',
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table if not exists h_reports (
  id text primary key,
  reporter_id text references h_profiles(id),
  target_type h_report_target_type not null,
  target_id text not null,
  reason text not null,
  status h_report_status default 'pending',
  created_at timestamptz default now()
);

create table if not exists h_blocks (
  blocker_id text references h_profiles(id) on delete cascade,
  blocked_id text references h_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists h_subscriptions (
  id text primary key,
  user_id text references h_profiles(id) on delete cascade,
  tier text default 'premium',
  amount text,
  started_at timestamptz default now(),
  expires_at timestamptz,
  auto_renew text default 'true',
  payment_key text
);

create table if not exists h_user_follows (
  follower_id text not null references h_profiles(id) on delete cascade,
  following_id text not null references h_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists h_activity_feed (
  id text primary key,
  user_id text not null references h_profiles(id) on delete cascade,
  type h_activity_type not null,
  target_id text not null,
  target_title text,
  metadata text,
  created_at timestamptz default now()
);

create table if not exists h_push_subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id text references h_profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create index if not exists h_idx_profiles_region on h_profiles(region);
create index if not exists h_idx_profiles_subscription on h_profiles(subscription_tier);
create index if not exists h_idx_clubs_category on h_clubs(category);
create index if not exists h_idx_clubs_region on h_clubs(region);
create index if not exists h_idx_clubs_owner on h_clubs(owner_id);
create index if not exists h_idx_club_members_user on h_club_members(user_id);
create index if not exists h_idx_club_posts_club on h_club_posts(club_id, created_at desc);
create index if not exists h_idx_club_posts_user on h_club_posts(user_id);
create index if not exists h_idx_meetings_club on h_club_meetings(club_id);
create index if not exists h_idx_meetings_date on h_club_meetings(date);
create index if not exists h_idx_meeting_participants_user on h_meeting_participants(user_id);
create index if not exists h_idx_reviews_meeting on h_meeting_reviews(meeting_id);
create index if not exists h_idx_reviews_user on h_meeting_reviews(user_id);
create index if not exists h_idx_info_category on h_info_contents(category);
create index if not exists h_idx_info_created on h_info_contents(created_at desc);
create index if not exists h_idx_community_category on h_community_posts(category);
create index if not exists h_idx_community_created on h_community_posts(created_at desc);
create index if not exists h_idx_community_region on h_community_posts(region);
create index if not exists h_idx_chat_rooms_club on h_chat_rooms(club_id);
create index if not exists h_idx_chat_members_user on h_chat_room_members(user_id);
create index if not exists h_idx_chat_requests_to on h_chat_requests(to_user, status);
create index if not exists h_idx_user_follows_follower on h_user_follows(follower_id);
create index if not exists h_idx_user_follows_following on h_user_follows(following_id);
create index if not exists h_idx_activity_feed_user on h_activity_feed(user_id, created_at desc);
create index if not exists h_idx_activity_feed_created on h_activity_feed(created_at desc);
create index if not exists h_idx_reports_status on h_reports(status);
create index if not exists h_idx_blocks_blocker on h_blocks(blocker_id);
create index if not exists h_idx_push_subs_user on h_push_subscriptions(user_id);
create index if not exists h_idx_fortune_date on h_fortune_master(date);
create index if not exists h_idx_fortune_zodiac on h_fortune_master(zodiac);
create index if not exists h_idx_clubs_search on h_clubs using gin (to_tsvector('simple', name || ' ' || coalesce(description, '')));
create index if not exists h_idx_info_search on h_info_contents using gin (to_tsvector('simple', title || ' ' || coalesce(content, '')));
create index if not exists h_idx_community_search on h_community_posts using gin (to_tsvector('simple', title || ' ' || coalesce(content, '')));

alter table h_profiles enable row level security;
alter table h_hobbies enable row level security;
alter table h_user_hobbies enable row level security;
alter table h_verification_badges enable row level security;
alter table h_places enable row level security;
alter table h_clubs enable row level security;
alter table h_club_members enable row level security;
alter table h_club_posts enable row level security;
alter table h_club_post_likes enable row level security;
alter table h_club_comments enable row level security;
alter table h_club_meetings enable row level security;
alter table h_meeting_participants enable row level security;
alter table h_meeting_reviews enable row level security;
alter table h_fortune_master enable row level security;
alter table h_fortune_comments enable row level security;
alter table h_info_contents enable row level security;
alter table h_info_comments enable row level security;
alter table h_community_posts enable row level security;
alter table h_community_likes enable row level security;
alter table h_community_comments enable row level security;
alter table h_chat_rooms enable row level security;
alter table h_chat_room_members enable row level security;
alter table h_chat_requests enable row level security;
alter table h_reports enable row level security;
alter table h_blocks enable row level security;
alter table h_subscriptions enable row level security;
alter table h_user_follows enable row level security;
alter table h_activity_feed enable row level security;
alter table h_push_subscriptions enable row level security;

create policy "profiles_select" on h_profiles for select using (true);
create policy "profiles_insert" on h_profiles for insert with check (auth.uid()::text = id);
create policy "profiles_update" on h_profiles for update using (auth.uid()::text = id);

create policy "hobbies_select" on h_hobbies for select using (true);

create policy "user_hobbies_select" on h_user_hobbies for select using (true);
create policy "user_hobbies_insert" on h_user_hobbies for insert with check (auth.uid()::text = user_id);
create policy "user_hobbies_delete" on h_user_hobbies for delete using (auth.uid()::text = user_id);

create policy "badges_select" on h_verification_badges for select using (true);

create policy "places_select" on h_places for select using (true);
create policy "places_insert" on h_places for insert with check (auth.uid() is not null);

create policy "clubs_select" on h_clubs for select using (true);
create policy "clubs_insert" on h_clubs for insert with check (auth.uid() is not null);
create policy "clubs_update" on h_clubs for update using (auth.uid()::text = owner_id);

create policy "club_members_select" on h_club_members for select using (true);
create policy "club_members_insert" on h_club_members for insert with check (auth.uid()::text = user_id);
create policy "club_members_delete" on h_club_members for delete using (auth.uid()::text = user_id);

create policy "club_posts_select" on h_club_posts for select using (true);
create policy "club_posts_insert" on h_club_posts for insert with check (auth.uid()::text = user_id);
create policy "club_posts_update" on h_club_posts for update using (auth.uid()::text = user_id);
create policy "club_posts_delete" on h_club_posts for delete using (auth.uid()::text = user_id);

create policy "club_post_likes_select" on h_club_post_likes for select using (true);
create policy "club_post_likes_insert" on h_club_post_likes for insert with check (auth.uid()::text = user_id);
create policy "club_post_likes_delete" on h_club_post_likes for delete using (auth.uid()::text = user_id);

create policy "club_comments_select" on h_club_comments for select using (true);
create policy "club_comments_insert" on h_club_comments for insert with check (auth.uid()::text = user_id);
create policy "club_comments_delete" on h_club_comments for delete using (auth.uid()::text = user_id);

create policy "meetings_select" on h_club_meetings for select using (true);
create policy "meetings_insert" on h_club_meetings for insert with check (auth.uid() is not null);

create policy "meeting_participants_select" on h_meeting_participants for select using (true);
create policy "meeting_participants_insert" on h_meeting_participants for insert with check (auth.uid()::text = user_id);
create policy "meeting_participants_delete" on h_meeting_participants for delete using (auth.uid()::text = user_id);

create policy "reviews_select" on h_meeting_reviews for select using (true);
create policy "reviews_insert" on h_meeting_reviews for insert with check (auth.uid()::text = user_id);
create policy "reviews_update" on h_meeting_reviews for update using (auth.uid()::text = user_id);
create policy "reviews_delete" on h_meeting_reviews for delete using (auth.uid()::text = user_id);

create policy "fortune_select" on h_fortune_master for select using (true);
create policy "fortune_comments_select" on h_fortune_comments for select using (true);
create policy "fortune_comments_insert" on h_fortune_comments for insert with check (auth.uid()::text = user_id);

create policy "info_contents_select" on h_info_contents for select using (true);
create policy "info_comments_select" on h_info_comments for select using (true);
create policy "info_comments_insert" on h_info_comments for insert with check (auth.uid()::text = user_id);

create policy "community_posts_select" on h_community_posts for select using (true);
create policy "community_posts_insert" on h_community_posts for insert with check (auth.uid()::text = user_id);
create policy "community_posts_update" on h_community_posts for update using (auth.uid()::text = user_id);
create policy "community_posts_delete" on h_community_posts for delete using (auth.uid()::text = user_id);

create policy "community_likes_select" on h_community_likes for select using (true);
create policy "community_likes_insert" on h_community_likes for insert with check (auth.uid()::text = user_id);
create policy "community_likes_delete" on h_community_likes for delete using (auth.uid()::text = user_id);

create policy "community_comments_select" on h_community_comments for select using (true);
create policy "community_comments_insert" on h_community_comments for insert with check (auth.uid()::text = user_id);
create policy "community_comments_delete" on h_community_comments for delete using (auth.uid()::text = user_id);

create policy "chat_rooms_select" on h_chat_rooms for select using (true);
create policy "chat_members_select" on h_chat_room_members for select using (auth.uid()::text = user_id);
create policy "chat_members_insert" on h_chat_room_members for insert with check (auth.uid()::text = user_id);
create policy "chat_requests_select" on h_chat_requests for select using (auth.uid()::text = from_user or auth.uid()::text = to_user);
create policy "chat_requests_insert" on h_chat_requests for insert with check (auth.uid()::text = from_user);
create policy "chat_requests_update" on h_chat_requests for update using (auth.uid()::text = to_user);

create policy "reports_insert" on h_reports for insert with check (auth.uid()::text = reporter_id);

create policy "blocks_select" on h_blocks for select using (auth.uid()::text = blocker_id);
create policy "blocks_insert" on h_blocks for insert with check (auth.uid()::text = blocker_id);
create policy "blocks_delete" on h_blocks for delete using (auth.uid()::text = blocker_id);

create policy "subscriptions_select" on h_subscriptions for select using (auth.uid()::text = user_id);
create policy "subscriptions_insert" on h_subscriptions for insert with check (auth.uid()::text = user_id);

create policy "follows_select" on h_user_follows for select using (true);
create policy "follows_insert" on h_user_follows for insert with check (auth.uid()::text = follower_id);
create policy "follows_delete" on h_user_follows for delete using (auth.uid()::text = follower_id);

create policy "activity_select" on h_activity_feed for select using (true);
create policy "activity_insert" on h_activity_feed for insert with check (auth.uid()::text = user_id);

create policy "push_select" on h_push_subscriptions for select using (auth.uid()::text = user_id);
create policy "push_insert" on h_push_subscriptions for insert with check (auth.uid()::text = user_id);
create policy "push_delete" on h_push_subscriptions for delete using (auth.uid()::text = user_id);

grant select on all tables in schema si_mvp to anon;
grant all on all tables in schema si_mvp to authenticated, service_role;
grant all on all routines in schema si_mvp to authenticated, service_role;
grant all on all sequences in schema si_mvp to authenticated, service_role;
