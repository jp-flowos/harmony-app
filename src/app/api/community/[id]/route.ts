import type { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-utils";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Placeholder — would query DB
  return jsonResponse({ id, title: "Sample post", content: "Content here" });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  return jsonResponse({ id, ...body });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return jsonResponse({ deleted: id });
}
