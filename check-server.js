#!/usr/bin/env node

/**
 * HEALTH CHECK - Waits for dev server to be ready
 * Works around Windows localhost/127.0.0.1 binding issues
 */

const http = require('http');

const URLS = [
  'http://127.0.0.1:3000/api/health',
  'http://localhost:3000/api/health',
];
const MAX_RETRIES = 20;
const RETRY_INTERVAL = 500; // 500ms

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, 5000);

    const req = http.get(url, { timeout: 5000 }, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (json.ok) {
              resolve({ url, data: json, elapsed: Date.now() - startTime });
            } else {
              reject(new Error('Health endpoint returned ok: false'));
            }
          } catch (err) {
            reject(new Error(`Invalid JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function checkHealth(attempt = 1) {
  try {
    console.log(`[${attempt}/${MAX_RETRIES}] Testing health endpoints...`);
    
    // Try 127.0.0.1 first (more reliable on Windows)
    let lastError = null;
    
    for (const url of URLS) {
      try {
        const result = await makeRequest(url);
        console.log(`\n✓ HEALTH CHECK PASSED\n`);
        console.log(`  URL:       ${result.url}`);
        console.log(`  OK:        ${result.data.ok}`);
        console.log(`  Timestamp: ${result.data.timestamp}`);
        console.log(`  Response:  ${result.elapsed}ms`);
        console.log(`  Attempt:   ${attempt}/${MAX_RETRIES}\n`);
        return true;
      } catch (err) {
        lastError = { url, error: err.message };
        // Try next URL
      }
    }

    // Both URLs failed
    if (attempt >= MAX_RETRIES) {
      console.error(`\n✗ HEALTH CHECK FAILED AFTER ${MAX_RETRIES} ATTEMPTS\n`);
      console.error(`Last error: ${lastError.url} - ${lastError.error}`);
      console.error(`\nTroubleshooting:`);
      console.error(`  1. Check if "npm run dev" is running`);
      console.error(`  2. Kill stale processes: Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force`);
      console.error(`  3. Clear lock: rm .next/dev/lock -Force`);
      console.error(`  4. Check for port 3000 conflicts: netstat -ano | findstr :3000`);
      console.error(`  5. Try: npm run dev -- -H 0.0.0.0`);
      return false;
    }

    console.log(`  Failed. Retrying in ${RETRY_INTERVAL}ms...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    return checkHealth(attempt + 1);
  } catch (err) {
    console.error(`Unexpected error: ${err.message}`);
    return false;
  }
}

console.log('\n=== DEV SERVER HEALTH CHECK ===\n');
checkHealth()
  .then(success => {
    process.exit(success ? 0 : 1);
  });
