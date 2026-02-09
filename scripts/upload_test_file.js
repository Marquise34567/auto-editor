const https = require('https');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Download failed: ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function parseServiceAccount(envVal) {
  if (!envVal) {
    // Try to read from .env.local in project root
    try {
      const repoEnv = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
      const m = repoEnv.match(/FIREBASE_SERVICE_ACCOUNT\s*=\s*('|")?([\s\S]*?)\1?\n/);
      if (m && m[2]) envVal = m[2].trim();
    } catch (e) {
      // ignore
    }
  }
  if (!envVal) throw new Error('FIREBASE_SERVICE_ACCOUNT env not set');
  // strip surrounding single quotes if present
  const raw = envVal.startsWith("'") && envVal.endsWith("'") ? envVal.slice(1, -1) : envVal;
  return JSON.parse(raw);
}

async function main() {
  const os = require('os');
  const tmpDir = os.tmpdir();
  const local = path.join(tmpDir, 'test-sse.mp4');

  // If repo has existing normalized mp4s in tmp/uploads, reuse one to avoid network/download issues
  const repoUploadsDir = path.resolve(__dirname, '..', 'tmp', 'uploads');
  let localCandidate = null;
  try {
    const files = fs.readdirSync(repoUploadsDir || '');
    const mp4 = files.find(f => f.toLowerCase().endsWith('-normalized.mp4'));
    if (mp4) localCandidate = path.join(repoUploadsDir, mp4);
  } catch (e) {}

  const candidates = [
    'https://file-examples.com/wp-content/uploads/2018/04/file_example_MP4_480_1_5MG.mp4',
    'https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  ];
  if (localCandidate) {
    console.log('Found existing local normalized mp4, using:', localCandidate);
    fs.copyFileSync(localCandidate, local);
  } else {
    let lastErr = null;
    for (const url of candidates) {
      try {
        console.log('Attempting download:', url);
        await download(url, local);
        console.log('Downloaded to', local);
        lastErr = null;
        break;
      } catch (e) {
        console.warn('Download failed for', url, e.message);
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
  }
  console.log('Downloaded to', local);

  const svc = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_STR);
  const projectId = svc.project_id || svc.projectId;
  const clientEmail = svc.client_email || svc.clientEmail;
  const privateKey = (svc.private_key || svc.privateKey || '').replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  const bucket = admin.storage().bucket();
  const destPath = 'uploads/test-sse.mp4';
  console.log('Uploading to', destPath);
  await bucket.upload(local, { destination: destPath, resumable: false, metadata: { contentType: 'video/mp4' } });
  console.log('Upload complete: gs://'+(bucket.name||process.env.FIREBASE_STORAGE_BUCKET)+'/'+destPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
