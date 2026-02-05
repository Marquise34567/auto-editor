/**
 * Client-side helper to upload a video file directly to Supabase Storage
 * via a signed URL (no serverless function payload size limits)
 */

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; signedUrl: string }> {
  // Step 1: Get the signed upload URL from the server
  const uploadUrlResponse = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!uploadUrlResponse.ok) {
    const errorData = await uploadUrlResponse.json();
    throw new Error(
      errorData.error ||
        `Failed to get upload URL: ${uploadUrlResponse.statusText}`
    );
  }

  const { signedUrl, path } = (await uploadUrlResponse.json()) as {
    signedUrl: string;
    path: string;
  };

  // Step 2: Upload the file directly to Supabase Storage via signed URL
  // Use XMLHttpRequest or fetch with progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ storagePath: path, signedUrl });
      } else {
        reject(
          new Error(
            `Upload failed with status ${xhr.status}: ${xhr.statusText}`
          )
        );
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was aborted"));
    });

    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
