import { NextResponse } from "next/server";
import { getJob } from "@/lib/server/jobStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    logs: job.logs,
    clips: job.clips,
    draftUrl: job.draftUrl,
    finalUrl: job.finalUrl,
    details: job.details,
    message: job.message,
  });
}
