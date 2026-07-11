import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db";
import { clubMeetings, clubs } from "@/db/schema";
import { formatMeetingDate } from "@/lib/format-date";
import { loadOgFont } from "@/lib/og-font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ meeting: clubMeetings, clubName: clubs.name })
    .from(clubMeetings)
    .leftJoin(clubs, eq(clubMeetings.clubId, clubs.id))
    .where(eq(clubMeetings.id, id))
    .limit(1);
  const font = await loadOgFont();

  const title = row?.meeting.title ?? "모임 초대장";
  const clubName = row?.clubName ?? "하모니";
  const dateLabel = row ? formatMeetingDate(row.meeting.date) : "";
  const location = row?.meeting.location ?? "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        backgroundColor: "#FFF7ED",
        fontFamily: "Pretendard",
        padding: 60,
      }}
    >
      <div style={{ fontSize: 40, color: "#EC6A52" }}>{clubName}</div>
      <div style={{ fontSize: 72, color: "#3D2C24", textAlign: "center", maxWidth: 1000 }}>
        {title}
      </div>
      <div style={{ fontSize: 40, color: "#8A6F5F" }}>{`📅 ${dateLabel}`}</div>
      <div style={{ fontSize: 40, color: "#8A6F5F" }}>{`📍 ${location}`}</div>
      <div
        style={{
          marginTop: 16,
          fontSize: 36,
          color: "#FFFFFF",
          backgroundColor: "#EC6A52",
          padding: "16px 48px",
          borderRadius: 24,
        }}
      >
        참석 여부를 알려주세요
      </div>
    </div>,
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700 }] }
  );
}
