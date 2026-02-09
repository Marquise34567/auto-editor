#!/usr/bin/env node

/**
 * Test script for health endpoint and pricing page
 * Run with: node scripts/test-endpoints.js
 */

const http = require('http');

function testEndpoint(path, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          ok: res.statusCode === 200,
          data: data.slice(0, 200)
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        path,
        status: 0,
        ok: false,
        error: err.message
      });
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        ok: false,
        error: 'Timeout'
      });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing auto-editor endpoints...\n');
  
  const results = await Promise.all([
    testEndpoint('/api/health'),
    testEndpoint('/pricing'),
  ]);
  
  let allPassed = true;
  for (const result of results) {
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} ${result.path}: ${result.status || 'ERROR'}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (!result.ok) allPassed = false;
  }
  
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
