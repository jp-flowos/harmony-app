-- Guest RSVP for public meeting invites (kakao share wedge).
-- Non-members respond to a meeting invite with just a name (+optional phone).
-- guest_phone is operator-facing only — never exposed on public pages/APIs.
--
-- Schema-qualified DDL (si_mvp.*) — no search_path dependency.

CREATE TYPE si_mvp.h_rsvp_status AS ENUM ('joined', 'declined');

CREATE TABLE si_mvp.h_meeting_rsvps (
  id text PRIMARY KEY,
  meeting_id text NOT NULL REFERENCES si_mvp.h_club_meetings(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text,
  status si_mvp.h_rsvp_status NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX h_meeting_rsvps_meeting_id_idx ON si_mvp.h_meeting_rsvps (meeting_id);
