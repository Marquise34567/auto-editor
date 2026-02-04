/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

async function findLatestUpload() {
  const uploadDir = path.join(process.cwd(), "tmp", "uploads");
  const entries = fs
    .readdirSync(uploadDir)
    .map((name) => ({
      name,
      fullPath: path.join(uploadDir, name),
      stats: fs.statSync(path.join(uploadDir, name)),
    }))
    .filter((entry) => entry.stats.isFile())
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

  if (!entries.length) {
    throw new Error("No uploaded files found in tmp/uploads");
  }

  return entries[0];
}

async function run() {
  const latest = await findLatestUpload();
  const relativePath = path.relative(process.cwd(), latest.fullPath);

  console.log("Using latest upload:", latest.fullPath);

  const analyzeRoute = require(path.join(
    process.cwd(),
    ".next",
    "server",
    "app",
    "api",
    "analyze",
    "route.js"
  ));
  const generateRoute = require(path.join(
    process.cwd(),
    ".next",
    "server",
    "app",
    "api",
    "generate",
    "route.js"
  ));

  const analyzeRequest = new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      selftest: true,
      path: relativePath,
    }),
  });

  console.log("Starting analyze...");
  const analyzeResponse = await analyzeRoute.POST(analyzeRequest);
  const analyzeJson = await analyzeResponse.json();

  if (analyzeResponse.status !== 200) {
    throw new Error(`Analyze failed: ${JSON.stringify(analyzeJson)}`);
  }

  console.log("Analyze complete:", {
    jobId: analyzeJson.jobId,
    duration: analyzeJson.duration,
  });

  const generateRequest = new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jobId: analyzeJson.jobId,
      soundEnhance: true,
    }),
  });

  console.log("Starting generate...");
  const generateResponse = await generateRoute.POST(generateRequest);
  const generateJson = await generateResponse.json();

  if (generateResponse.status !== 200) {
    throw new Error(`Generate failed: ${JSON.stringify(generateJson)}`);
  }

  console.log("Generate complete:", {
    outputUrl: generateJson.outputUrl,
    inputSizeBytes: generateJson.inputSizeBytes,
    outputSizeBytes: generateJson.outputSizeBytes,
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
