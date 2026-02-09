#!/usr/bin/env node

/**
 * Pre-deployment verification script
 * Run: node scripts/verify-deploy.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AUTO-EDITOR DEPLOYMENT VERIFICATION\n');

const checks = [];

// Check 1: package.json exists
try {
  const pkg = require('../package.json');
  checks.push({ name: 'package.json', status: '✅', detail: `v${pkg.version}` });
} catch (e) {
  checks.push({ name: 'package.json', status: '❌', detail: 'Missing' });
}

// Check 2: next.config.ts exists
try {
  fs.accessSync(path.join(__dirname, '..', 'next.config.ts'));
  checks.push({ name: 'next.config.ts', status: '✅', detail: 'Found' });
} catch (e) {
  checks.push({ name: 'next.config.ts', status: '❌', detail: 'Missing' });
}

// Check 3: .gitignore exists
try {
  const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
  const hasEnv = gitignore.includes('.env');
  const hasTmp = gitignore.includes('/tmp');
  const hasNext = gitignore.includes('.next');
  checks.push({ 
    name: '.gitignore', 
    status: hasEnv && hasTmp && hasNext ? '✅' : '⚠️', 
    detail: `env:${hasEnv} tmp:${hasTmp} .next:${hasNext}` 
  });
} catch (e) {
  checks.push({ name: '.gitignore', status: '❌', detail: 'Missing' });
}

// Check 4: Health endpoint exists
try {
  fs.accessSync(path.join(__dirname, '..', 'src', 'app', 'api', 'health', 'route.ts'));
  checks.push({ name: '/api/health', status: '✅', detail: 'Exists' });
} catch (e) {
  checks.push({ name: '/api/health', status: '❌', detail: 'Missing' });
}

// Check 5: Error boundaries exist
try {
  fs.accessSync(path.join(__dirname, '..', 'src', 'app', 'error.tsx'));
  fs.accessSync(path.join(__dirname, '..', 'src', 'app', 'global-error.tsx'));
  checks.push({ name: 'Error Boundaries', status: '✅', detail: 'error.tsx + global-error.tsx' });
} catch (e) {
  checks.push({ name: 'Error Boundaries', status: '⚠️', detail: 'Incomplete' });
}

// Check 6: .env.example exists
try {
  fs.accessSync(path.join(__dirname, '..', '.env.example'));
  checks.push({ name: '.env.example', status: '✅', detail: 'Found' });
} catch (e) {
  checks.push({ name: '.env.example', status: '⚠️', detail: 'Missing (optional)' });
}

// Check 7: Git initialized
try {
  fs.accessSync(path.join(__dirname, '..', '.git'));
  checks.push({ name: 'Git Repository', status: '✅', detail: 'Initialized' });
} catch (e) {
  checks.push({ name: 'Git Repository', status: '❌', detail: 'Not initialized' });
}

// Check 8: Deployment docs exist
try {
  fs.accessSync(path.join(__dirname, '..', 'DEPLOY_STEPS.md'));
  fs.accessSync(path.join(__dirname, '..', 'DEPLOYMENT.md'));
  checks.push({ name: 'Documentation', status: '✅', detail: 'Complete' });
} catch (e) {
  checks.push({ name: 'Documentation', status: '⚠️', detail: 'Incomplete' });
}

// Display results
checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(25)} ${check.detail}`);
});

// Check for FFmpeg usage
console.log('\n🎬 FFmpeg Detection:');
try {
  const analyzeFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', 'api', 'analyze', 'route.ts'),
    'utf8'
  );
  const hasFFmpeg = analyzeFile.includes('ffmpeg') || analyzeFile.includes('ffprobe');
  if (hasFFmpeg) {
    console.log('⚠️  FFmpeg detected in /api/analyze');
    console.log('   → Vercel will timeout for video processing');
    console.log('   → Deploy backend to Railway/Render for production');
  }
} catch (e) {
  console.log('✅ No FFmpeg detected (lightweight deployment)');
}

// Final recommendation
console.log('\n📋 DEPLOYMENT STATUS:');
const allGood = checks.every(c => c.status === '✅');
if (allGood) {
  console.log('✅ Ready for deployment!');
  console.log('\n📝 Next steps:');
  console.log('   1. Configure git: git config --global user.name "Your Name"');
  console.log('   2. Commit: git commit -m "Initial commit"');
  console.log('   3. Push to GitHub');
  console.log('   4. Deploy to Vercel');
  console.log('\n📖 See DEPLOY_STEPS.md for detailed instructions');
} else {
  console.log('⚠️  Some checks failed. Review above and fix issues.');
}

console.log('\n');
