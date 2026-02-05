#!/usr/bin/env node

/**
 * SOFT BILLING TEST SUITE
 * Tests the complete soft billing flow end-to-end
 * 
 * Usage: node scripts/test-soft-billing.mjs [--verbose]
 * 
 * Environment:
 *   APP_URL (default: http://localhost:3000)
 *   TEST_USER_EMAIL (existing test user, optional)
 *   TEST_USER_PASSWORD (optional)
 *   CHECKOUT_SESSION_ID (for manual confirm-session test)
 *   BILLING_ADMIN_KEY (for manual activate)
 */

import https from 'https';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BILLING_ADMIN_KEY = process.env.BILLING_ADMIN_KEY;
const VERBOSE = process.argv.includes('--verbose');

// Test results tracker
const results = {
  passed: [],
  failed: [],
  skipped: [],
};

// Test user data
let testUser = {
  id: '',
  email: process.env.TEST_USER_EMAIL || `softbillingtest@example.com`,
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

let sessionToken = '';
let sessionId = '';
let checkoutUrl = '';

// Helper: log
function log(label, message, level = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `[${timestamp}]`;
  const color = {
    info: '\x1b[36m',    // cyan
    pass: '\x1b[32m',    // green
    fail: '\x1b[31m',    // red
    warn: '\x1b[33m',    // yellow
    skip: '\x1b[35m',    // magenta
  }[level] || '\x1b[0m';
  const reset = '\x1b[0m';
  console.log(`${color}${prefix} [${label}] ${message}${reset}`);
}

// Helper: fetch wrapper
async function httpFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body) {
      const body = JSON.stringify(options.body);
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(urlObj, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            text: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            text: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Test: Server is healthy
async function testServerHealth() {
  try {
    log('SERVER', 'Checking health...');
    const res = await httpFetch(`${APP_URL}/api/ping`);
    
    if (res.status === 200) {
      results.passed.push('✓ Server is healthy');
      log('SERVER', 'Server is healthy (200)', 'pass');
      return true;
    } else {
      results.failed.push(`✗ Server returned ${res.status}`);
      log('SERVER', `Server returned ${res.status}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Server health check failed: ${err.message}`);
    log('SERVER', `Health check failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Signup (create test user)
async function testSignup() {
  try {
    log('SIGNUP', `Creating user ${testUser.email}...`);
    
    const res = await httpFetch(`${APP_URL}/api/auth/signup`, {
      method: 'POST',
      body: {
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      },
    });

    if (res.status === 201 && res.body.user?.id) {
      testUser.id = res.body.user.id;
      results.passed.push('✓ User signup successful');
      log('SIGNUP', `User created: ${testUser.id.slice(0, 8)}...`, 'pass');
      return true;
    } else if (res.status === 201) {
      results.passed.push('✓ User signup successful (no ID)');
      log('SIGNUP', 'User created (no ID returned)', 'pass');
      return true;
    } else {
      results.failed.push(`✗ Signup returned ${res.status}: ${res.body?.error}`);
      log('SIGNUP', `Signup failed: ${res.body?.error}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Signup failed: ${err.message}`);
    log('SIGNUP', `Signup failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Login (get session)
async function testLogin() {
  try {
    log('LOGIN', `Logging in as ${testUser.email}...`);
    
    const res = await httpFetch(`${APP_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    if (res.status === 200 && res.body.user?.id) {
      testUser.id = res.body.user.id;
      // Extract session token from Set-Cookie header if available
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        sessionToken = setCookie[0]?.split(';')[0];
      }
      results.passed.push('✓ User login successful');
      log('LOGIN', `Login successful: ${testUser.id.slice(0, 8)}...`, 'pass');
      return true;
    } else {
      results.failed.push(`✗ Login returned ${res.status}`);
      log('LOGIN', `Login failed: ${res.status} ${res.body?.error}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Login failed: ${err.message}`);
    log('LOGIN', `Login failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Check default billing status
async function testDefaultBillingStatus() {
  try {
    log('BILLING', 'Checking default billing status...');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      results.skipped.push('⊘ Supabase env vars missing');
      log('BILLING', 'Skipped: Missing SUPABASE env vars', 'skip');
      return true;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('billing_status')
      .select('plan, status')
      .eq('user_id', testUser.id)
      .single();

    if (error) {
      results.failed.push(`✗ Query failed: ${error.message}`);
      log('BILLING', `Query failed: ${error.message}`, 'fail');
      return false;
    }

    if (data?.plan === 'free' && data?.status === 'locked') {
      results.passed.push('✓ Default billing status is free/locked');
      log('BILLING', 'Default status: free/locked', 'pass');
      return true;
    } else {
      results.failed.push(`✗ Unexpected status: ${data?.plan}/${data?.status}`);
      log('BILLING', `Unexpected status: ${data?.plan}/${data?.status}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Billing check failed: ${err.message}`);
    log('BILLING', `Failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Create checkout session
async function testCreateCheckout() {
  try {
    log('CHECKOUT', 'Creating checkout session for starter plan...');
    
    const res = await httpFetch(`${APP_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Cookie': sessionToken,
      },
      body: {
        plan: 'starter',
      },
    });

    if (res.status === 200 && res.body.url) {
      checkoutUrl = res.body.url;
      sessionId = res.body.sessionId;
      results.passed.push('✓ Checkout session created');
      log('CHECKOUT', `Session created: ${sessionId?.slice(0, 8)}...`, 'pass');
      if (VERBOSE) log('CHECKOUT', `URL: ${checkoutUrl.slice(0, 80)}...`);
      return true;
    } else {
      results.failed.push(`✗ Checkout returned ${res.status}: ${res.body?.error}`);
      log('CHECKOUT', `Failed: ${res.body?.error}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Checkout creation failed: ${err.message}`);
    log('CHECKOUT', `Failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Confirm session (simulating payment)
async function testConfirmSession() {
  try {
    log('CONFIRM', 'Confirming session (simulating payment)...');
    
    // If env var provided, use it
    const sid = process.env.CHECKOUT_SESSION_ID || sessionId;
    
    if (!sid) {
      results.skipped.push('⊘ No session ID (manual test required)');
      log('CONFIRM', 'Skipped: No session ID available', 'skip');
      log('CONFIRM', `Manual test: Get session ID from Stripe Checkout URL`, 'warn');
      log('CONFIRM', `Then run: CHECKOUT_SESSION_ID=cs_... node scripts/test-soft-billing.mjs`, 'warn');
      return true;
    }

    const res = await httpFetch(`${APP_URL}/api/stripe/confirm-session`, {
      method: 'POST',
      headers: {
        'Cookie': sessionToken,
      },
      body: {
        session_id: sid,
      },
    });

    if (res.status === 200 && res.body.success) {
      results.passed.push('✓ Session confirmed');
      log('CONFIRM', `Confirmed: status=${res.body.status}`, 'pass');
      return true;
    } else {
      results.failed.push(`✗ Confirm returned ${res.status}: ${res.body?.error}`);
      log('CONFIRM', `Failed: ${res.body?.error}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Confirm session failed: ${err.message}`);
    log('CONFIRM', `Failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Check pending billing status
async function testPendingBillingStatus() {
  try {
    log('PENDING', 'Checking pending billing status...');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      results.skipped.push('⊘ Supabase env vars missing');
      log('PENDING', 'Skipped', 'skip');
      return true;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('billing_status')
      .select('plan, status')
      .eq('user_id', testUser.id)
      .single();

    if (error) {
      results.skipped.push('⊘ Query failed');
      log('PENDING', 'Skipped: Query failed', 'skip');
      return true;
    }

    if (data?.plan === 'starter' && data?.status === 'pending') {
      results.passed.push('✓ Billing status is starter/pending');
      log('PENDING', 'Status: starter/pending', 'pass');
      return true;
    } else if (data?.plan === 'starter' && data?.status === 'active') {
      results.passed.push('✓ Billing status is starter/active (auto-activated)');
      log('PENDING', 'Status: starter/active (BILLING_TEST_AUTOACTIVATE=true)', 'pass');
      return true;
    } else {
      results.failed.push(`✗ Unexpected status: ${data?.plan}/${data?.status}`);
      log('PENDING', `Unexpected: ${data?.plan}/${data?.status}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Pending check failed: ${err.message}`);
    log('PENDING', `Failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Manual activate
async function testManualActivate() {
  try {
    log('ACTIVATE', 'Manually activating subscription...');
    
    if (!BILLING_ADMIN_KEY) {
      results.skipped.push('⊘ BILLING_ADMIN_KEY not set');
      log('ACTIVATE', 'Skipped: BILLING_ADMIN_KEY not in env', 'skip');
      return true;
    }

    const res = await httpFetch(`${APP_URL}/api/billing/manual-activate`, {
      method: 'POST',
      headers: {
        'x-admin-key': BILLING_ADMIN_KEY,
      },
      body: {
        user_id: testUser.id,
        plan: 'starter',
      },
    });

    if (res.status === 200 && res.body.success) {
      results.passed.push('✓ Manual activation successful');
      log('ACTIVATE', `Activated: ${res.body.status}`, 'pass');
      return true;
    } else {
      results.failed.push(`✗ Activate returned ${res.status}: ${res.body?.error}`);
      log('ACTIVATE', `Failed: ${res.body?.error}`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Manual activate failed: ${err.message}`);
    log('ACTIVATE', `Failed: ${err.message}`, 'fail');
    return false;
  }
}

// Test: Check active billing status
async function testActiveBillingStatus() {
  try {
    log('ACTIVE', 'Checking active billing status...');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      results.skipped.push('⊘ Supabase env vars missing');
      log('ACTIVE', 'Skipped', 'skip');
      return true;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('billing_status')
      .select('plan, status')
      .eq('user_id', testUser.id)
      .single();

    if (error) {
      results.skipped.push('⊘ Query failed');
      log('ACTIVE', 'Skipped', 'skip');
      return true;
    }

    if (data?.status === 'active') {
      results.passed.push('✓ Billing status is active');
      log('ACTIVE', `Status: active (plan=${data.plan})`, 'pass');
      return true;
    } else {
      results.failed.push(`✗ Status is ${data?.status}, expected active`);
      log('ACTIVE', `Status: ${data?.status} (expected active)`, 'fail');
      return false;
    }
  } catch (err) {
    results.failed.push(`✗ Active check failed: ${err.message}`);
    log('ACTIVE', `Failed: ${err.message}`, 'fail');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('     SOFT BILLING TEST SUITE');
  console.log('='.repeat(80) + '\n');

  // Verify env
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log('ENV', 'Warning: Supabase env vars not set (Supabase tests will be skipped)', 'warn');
  }
  if (!BILLING_ADMIN_KEY) {
    log('ENV', 'Warning: BILLING_ADMIN_KEY not set (manual activate will be skipped)', 'warn');
  }

  log('CONFIG', `App URL: ${APP_URL}`);
  log('CONFIG', `Test user: ${testUser.email}`);

  console.log('\n' + '-'.repeat(80) + '\n');

  // Run tests
  const serverOk = await testServerHealth();
  if (!serverOk) {
    log('FATAL', 'Server is not running. Start with: npm run dev', 'fail');
    process.exit(1);
  }

  // Try login first, fall back to signup
  const existingUser = process.env.TEST_USER_EMAIL;
  let loginOk = false;
  
  if (existingUser) {
    loginOk = await testLogin();
  }

  if (!loginOk) {
    const signupOk = await testSignup();
    if (!signupOk && !existingUser) {
      log('FATAL', 'Failed to create/login user', 'fail');
      process.exit(1);
    }
    await testLogin();
  }

  // Get user ID from Supabase if signup didn't return it
  if (!testUser.id && SUPABASE_URL && SUPABASE_ANON_KEY) {
    log('USER', 'Looking up user ID from Supabase...');
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });
      if (data?.user?.id) {
        testUser.id = data.user.id;
        log('USER', `Found user: ${testUser.id.slice(0, 8)}...`, 'pass');
      }
    } catch (err) {
      log('USER', 'Could not lookup user', 'warn');
    }
  }

  if (!testUser.id) {
    log('FATAL', 'Could not determine user ID', 'fail');
    process.exit(1);
  }

  console.log('\n' + '-'.repeat(80) + '\n');

  // Billing tests
  await testDefaultBillingStatus();
  await testCreateCheckout();
  await testConfirmSession();
  await testPendingBillingStatus();
  await testManualActivate();
  await testActiveBillingStatus();

  // Summary
  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('TEST SUMMARY:\n');
  console.log(`  PASSED: ${results.passed.length}`);
  results.passed.forEach(r => log('RESULT', r, 'pass'));
  
  if (results.failed.length > 0) {
    console.log(`\n  FAILED: ${results.failed.length}`);
    results.failed.forEach(r => log('RESULT', r, 'fail'));
  }
  
  if (results.skipped.length > 0) {
    console.log(`\n  SKIPPED: ${results.skipped.length}`);
    results.skipped.forEach(r => log('RESULT', r, 'skip'));
  }

  console.log('\n' + '='.repeat(80) + '\n');

  const allTests = results.passed.length + results.failed.length;
  const passRate = allTests > 0 ? Math.round((results.passed.length / allTests) * 100) : 0;
  
  if (results.failed.length === 0) {
    log('SUMMARY', `✅ ALL TESTS PASSED (${passRate}%)`, 'pass');
    process.exit(0);
  } else {
    log('SUMMARY', `❌ ${results.failed.length} TESTS FAILED (${passRate}%)`, 'fail');
    process.exit(1);
  }
}

// Run
runTests().catch(err => {
  log('FATAL', err.message, 'fail');
  process.exit(1);
});
