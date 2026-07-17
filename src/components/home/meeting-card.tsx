import { CalendarBlank, MapPin } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AvatarStack } from "@/components/club/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { categoryEmoji } from "@/lib/club-emoji";
import { dDayLabel, formatMeetingDateShort } from "@/lib/format-date";
import type { PopularMeeting } from "@/lib/queries/home";

// 홈 "인기 모임" 가로 스크롤 카드 (시안: D-day 뱃지 + 이미지 + 일시/장소 + 참여 아바타 + 정원)
export function MeetingCard({ meeting }: { meeting: PopularMeeting }) {
  return (
    <Link
      href={`/club/${meeting.clubId}/meeting/${meeting.id}`}
      className="block w-[220px] shrink-0"
    >
      <Card className="h-full overflow-hidden transition-all hover:shadow-warm">
        {meeting.coverImage ? (
          // biome-ignore lint/performance/noImgElement: coverImage가 remotePatterns에 보장되지 않는 임의 URL일 수 있음
          <img src={meeting.coverImage} alt="" className="h-24 w-full object-cover" />
        ) : (
          <div className="flex h-24 w-full items-center justify-center bg-cream-100 text-4xl">
            {categoryEmoji(meeting.category)}
          </div>
        )}
        <CardContent className="space-y-1.5 p-4">
          <Badge variant="default">{dDayLabel(meeting.date)}</Badge>
          <h3 className="truncate text-lg font-extrabold text-mocha-900">{meeting.title}</h3>
          <p className="flex items-center gap-1 text-sm font-semibold text-mocha-700">
            <CalendarBlank size={14} weight="duotone" className="shrink-0" />
            {formatMeetingDateShort(meeting.date)}
          </p>
          <p className="flex items-center gap-1 text-sm font-semibold text-mocha-700">
            <MapPin size={14} weight="duotone" className="shrink-0" />
            <span className="truncate">{meeting.location}</span>
          </p>
          <div className="flex items-center pt-1">
            <AvatarStack
              avatarUrls={meeting.participantAvatars}
              extraCount={Math.max(0, meeting.joinedCount - meeting.participantAvatars.length)}
            />
            <span className="ml-auto shrink-0 text-sm font-bold text-mocha-700">
              {meeting.joinedCount}/{meeting.maxParticipants}명
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
