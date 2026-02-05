import { createAdminClient } from "./server";

/**
 * Get a signed download URL for a video in Supabase Storage
 */
export async function getSignedDownloadUrl(
  storagePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from("videos")
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed download URL: ${error.message}`);
  }

  if (!data) {
    throw new Error("No signed URL returned from storage");
  }

  return data.signedUrl;
}

/**
 * Delete a video from Supabase Storage
 */
export async function deleteVideoFile(storagePath: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from("videos")
    .remove([storagePath]);

  if (error) {
    console.error(`Failed to delete video: ${error.message}`);
    // Don't throw - deletion errors shouldn't block other operations
  }
}
