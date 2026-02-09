#!/usr/bin/env node

/**
 * Test all pages in the app
 */

const http = require('http');

const pages = [
  { path: '/', name: 'Home' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/login', name: 'Login' },
  { path: '/editor', name: 'Editor' },
  { path: '/checkout?plan=starter&billingCycle=monthly&returnTo=/pricing', name: 'Checkout' },
  { path: '/billing/success?returnTo=/pricing', name: 'Billing Success' },
  { path: '/api/health', name: 'Health API' },
];

function testPage(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          ok: res.statusCode === 200 || res.statusCode === 401, // 401 is ok for protected routes
          contentLength: data.length
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
    
    req.setTimeout(5000, () => {
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
  console.log('🧪 Testing all pages...\n');
  
  for (const page of pages) {
    const result = await testPage(page.path);
    const icon = result.ok ? '✅' : '❌';
    const status = result.status || 'ERROR';
    const size = result.contentLength ? `(${(result.contentLength / 1024).toFixed(1)}KB)` : '';
    console.log(`${icon} ${page.name.padEnd(20)} ${page.path.padEnd(50)} ${status} ${size}`);
    if (result.error) console.log(`   ⚠️  ${result.error}`);
  }
  
  console.log('\n✅ Page test complete!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
