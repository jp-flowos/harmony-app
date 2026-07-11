import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarDots, MapPin, Users } from "@phosphor-icons/react/dist/ssr";
import { ShareBar } from "@/components/share/ShareBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { clubMeetings, clubs, meetingParticipants, meetingRsvps, profiles } from "@/db/schema";
import { formatMeetingDate } from "@/lib/format-date";
import { RsvpForm } from "./RsvpForm";

const getMeeting = cache(async (id: string) => {
  const [row] = await db
    .select({ meeting: clubMeetings, clubName: clubs.name })
    .from(clubMeetings)
    .leftJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(eq(clubMeetings.id, id))
    .limit(1);
  return row ?? null;
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getMeeting(id);
  if (!row) return {};
  const { meeting, clubName } = row;
  return {
    title: `${clubName ?? "하모니"} · ${meeting.title}`,
    description: `${formatMeetingDate(meeting.date)} · ${meeting.location} · 참석 여부를 알려주세요`,
  };
}

function kakaoMapUrl(location: string, lat: string | null, lng: string | null): string {
  if (lat && lng) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(location)},${lat},${lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(location)}`;
}

export default async function MeetingInvitePage({ params }: Props) {
  const { id } = await params;
  const row = await getMeeting(id);
  if (!row) notFound();
  const { meeting, clubName } = row;

  const participantRows = await db
    .select({ nickname: profiles.nickname, status: meetingParticipants.status })
    .from(meetingParticipants)
    .leftJoin(profiles, eq(meetingParticipants.userId, profiles.id))
    .where(eq(meetingParticipants.meetingId, id));
  const guestRows = await db
    .select({ id: meetingRsvps.id, name: meetingRsvps.guestName, status: meetingRsvps.status })
    .from(meetingRsvps)
    .where(eq(meetingRsvps.meetingId, id))
    .orderBy(asc(meetingRsvps.createdAt));

  const attendees = [
    ...participantRows
      .filter((p) => p.status === "joined")
      .map((p, i) => ({ key: `p-${i}`, name: p.nickname ?? "회원" })),
    ...guestRows.filter((g) => g.status === "joined").map((g) => ({ key: g.id, name: g.name })),
  ];
  const isPast = meeting.date < new Date();
  const isFull = attendees.length >= (meeting.maxParticipants ?? 20);
  const dateLabel = formatMeetingDate(meeting.date);

  return (
    <div className="space-y-4 p-5">
      <div className="pt-2 text-center">
        <p className="text-lg font-bold text-coral-600">{clubName ?? "하모니 모임"}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-mocha-900">
          {meeting.title}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="flex items-center gap-2 text-lg text-mocha-900">
            <CalendarDots size={24} weight="duotone" className="shrink-0 text-coral-500" />
            {dateLabel}
          </p>
          <div className="flex items-center gap-2 text-lg text-mocha-900">
            <MapPin size={24} weight="duotone" className="shrink-0 text-coral-500" />
            <span className="flex-1">{meeting.location}</span>
            <a
              href={kakaoMapUrl(meeting.location, meeting.locationLat, meeting.locationLng)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sage-50 px-3 py-2 text-base font-bold text-sage-700"
            >
              길찾기
            </a>
          </div>
          <p className="flex items-center gap-2 text-lg text-mocha-900">
            <Users size={24} weight="duotone" className="shrink-0 text-coral-500" />
            {attendees.length}명 참석 (최대 {meeting.maxParticipants ?? 20}명)
          </p>
          {meeting.description && (
            <p className="border-t border-mocha-100 pt-3 text-base leading-relaxed text-mocha-800">
              {meeting.description}
            </p>
          )}
        </CardContent>
      </Card>

      {isPast ? (
        <p className="py-4 text-center text-lg font-semibold text-mocha-500">지난 모임이에요</p>
      ) : (
        <RsvpForm meetingId={meeting.id} isFull={isFull} />
      )}

      {attendees.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">참석하는 분들</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <Badge key={a.key} variant="secondary" className="text-base">
                {a.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <ShareBar
          title={`${clubName ?? "하모니 모임"} · ${meeting.title}`}
          description={`${dateLabel} · ${meeting.location}`}
          path={`/s/meeting/${meeting.id}`}
        />
      </div>

      <p className="text-center text-base font-semibold text-mocha-700">
        하모니에 가입하면 다음 모임 알림을 받을 수 있어요
      </p>
    </div>
  );
}
