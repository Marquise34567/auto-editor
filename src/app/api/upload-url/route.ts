import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      filename: string;
      contentType: string;
    };

    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    // Validate video MIME type
    if (!contentType.startsWith("video/")) {
      return NextResponse.json(
        { error: "Content type must be a video MIME type" },
        { status: 400 }
      );
    }

    // Create admin client for server-side signed URL generation
    const adminClient = createAdminClient();

    // Generate unique path: userId/timestamp-uuid/filename
    const timestamp = Date.now();
    const uuid = randomUUID();
    const storagePath = `${user.id}/${timestamp}-${uuid}/${filename}`;

    // Create signed upload URL (expires in 1 hour)
    const { data, error } = await adminClient.storage
      .from("videos")
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (error) {
      console.error("[upload-url] Storage error:", error);
      return NextResponse.json(
        { error: "Failed to generate upload URL", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: storagePath,
    });
  } catch (error) {
    console.error("[upload-url] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
