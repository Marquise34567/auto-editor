const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const BASE_URL = "http://127.0.0.1:3000";
const TMP_DIR = path.resolve(process.cwd(), "tmp");
const SELFTEST_DIR = path.resolve(TMP_DIR, "selftest");
const TEST_VIDEO = path.resolve(SELFTEST_DIR, "test.mp4");

function resolveFfmpegPath() {
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {
    // ignore
  }

  return "ffmpeg";
}

function runBin(binPath, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binPath, args, {
      cwd: opts.cwd,
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function findExistingVideo(dir) {
  if (!fs.existsSync(dir)) return null;
  const queue = [dir];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (current.includes(path.join("tmp", "selftest"))) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (/\.(mp4|mov|mkv)$/i.test(entry.name)) {
        return fullPath;
      }
    }
  }
  return null;
}

async function ensureTestVideo() {
  fs.mkdirSync(SELFTEST_DIR, { recursive: true });

  if (fs.existsSync(TEST_VIDEO)) {
    return TEST_VIDEO;
  }

  const existing = findExistingVideo(TMP_DIR);
  if (existing) {
    fs.copyFileSync(existing, TEST_VIDEO);
    return TEST_VIDEO;
  }

  const ffmpegPath = resolveFfmpegPath();
  const args = [
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=1280x720:rate=30",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1000",
    "-t",
    "3",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    TEST_VIDEO,
    "-y",
  ];

  console.log("[selftest] Generating test video with ffmpeg...");
  console.log("[selftest] bin:", ffmpegPath);
  console.log("[selftest] args:", args);

  const result = await runBin(ffmpegPath, args);
  if (result.code !== 0) {
    console.error("[selftest] ffmpeg failed:", result.code);
    console.error(result.stderr.slice(0, 4000));
    process.exit(1);
  }

  return TEST_VIDEO;
}

async function run() {
  await ensureTestVideo();

  console.log("[selftest] Checking API health...");
  const health = await fetch(`${BASE_URL}/api/health`);
  if (!health.ok) {
    const body = await health.text();
    console.error("❌ FAIL: /api/health", health.status);
    console.error(body.slice(0, 4000));
    process.exit(1);
  }

  console.log("[selftest] Running analyze...");
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selftest: true,
      path: path.relative(process.cwd(), TEST_VIDEO),
      clipLengths: [15, 30],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error(`❌ FAIL: /api/analyze HTTP ${response.status}`);
    console.error(raw.slice(0, 4000));
    process.exit(1);
  }

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("❌ FAIL: Could not parse JSON response");
    console.error(raw.slice(0, 4000));
    process.exit(1);
  }

  const jobId = data?.jobId ?? "unknown";
  const duration = data?.duration ?? 0;
  const candidates = Array.isArray(data?.candidates) ? data.candidates.length : 0;

  await new Promise((resolve) => setTimeout(resolve, 1200));

  let statusInfo = "unknown";
  try {
    const statusResponse = await fetch(
      `${BASE_URL}/api/job-status?id=${encodeURIComponent(jobId)}`
    );
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      statusInfo = `${statusData.status ?? "unknown"} (${statusData.stage ?? ""})`;
    }
  } catch {
    // ignore
  }

  console.log("✅ PASS: /api/analyze");
  console.log(`jobId: ${jobId}`);
  console.log(`duration: ${duration}`);
  console.log(`candidates: ${candidates}`);
  console.log(`next stage: ${statusInfo}`);
}

run().catch((error) => {
  console.error("❌ FAIL: selftest unexpected error");
  console.error(error?.message || error);
  process.exit(1);
});
