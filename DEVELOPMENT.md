# Development Workflow Guide

## Quick Start

### 1. Start Development Server
**Option A: VS Code Task**
- Press `Ctrl+Shift+D` → Select "Dev Server" → Run
- Or: `Ctrl+Shift+B` → "Dev Server"

**Option B: Terminal**
```bash
npm run dev
```

Server will be available at: **http://localhost:3000**

---

## VS Code Tasks

All development tasks are configured in `.vscode/tasks.json`. Access them via:
- **Keyboard:** `Ctrl+Shift+B` (Build tasks) or `Ctrl+Shift+T` (Test tasks)
- **Menu:** Terminal → Run Task

### Build Tasks

#### **Dev Server** (Default)
Starts Next.js development server with hot reload
```bash
npm run dev
```
- Port: 3000
- Hot module reload enabled
- Source maps enabled

#### **Build**
Production build for deployment
```bash
npm run build
```
- Compiles TypeScript
- Optimizes bundle
- Generates `.next/` directory

#### **Clean & Rebuild**
Full clean rebuild (removes cache)
```powershell
rm -r .next
rm -r node_modules/.cache
npm run build
```

#### **Lint**
Check ESLint rules across codebase
```bash
npm run lint
```

---

## Test Tasks

### Authentication Tests

#### **Test Auth: Signup**
Register a new user
```bash
Uses endpoint: POST /api/auth/signup
Email: testuser@example.com
Password: TestPass123
```

#### **Test Auth: Login**
Sign in with credentials
```bash
Uses endpoint: POST /api/auth/login
Email: testuser@example.com
Password: TestPass123
```

#### **Test Auth: Get User (/api/auth/me)**
Fetch current authenticated user 
```bash
Uses endpoint: GET /api/auth/me
Returns: user object with id, email, createdAt
Status: 200 if logged in, 401 if not
```

#### **Test Auth: Logout**
Sign out and clear session
```bash
Uses endpoint: POST /api/auth/logout
Clears auth cookies
```

---

## Manual Testing

### 1. Test Complete Auth Flow

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests in order
# 1. Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"pass123","confirmPassword":"pass123"}'

# 2. Check that you're logged in
curl http://localhost:3000/api/auth/me -b cookies.txt
# Expected: 200 { user: {...} }

# 3. Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt

# 4. Verify logged out
curl http://localhost:3000/api/auth/me -b cookies.txt
# Expected: 401 { success: false }
```

### 2. Browser Testing

1. Open http://localhost:3000
2. Navigate to Sign Up or Sign In
3. Enter credentials
4. Open DevTools (F12) → Application → Cookies
5. Verify `sb-<project-id>-auth-token` cookie exists
6. Refresh page - should stay logged in
7. Check `/api/auth/me` works

---

## Debugging

### VS Code Debugger

Available configurations in `.vscode/launch.json`:

#### **Debug Server Only**
- Select "Next.js (Server)" in debug sidebar
- Sets breakpoints in API routes and server components
- Press F5 to start

#### **Debug Full Stack**  
- Select "Next.js (Full Stack)"
- Debugs both server (Node) and browser
- Requires Chrome installed

#### **Attach to Running Server**
```bash
# Terminal 1: Start with inspect flag
npm run dev -- --experimental-app-dir -- --inspect=0.0.0.0:9229

# Terminal 2: In VS Code, select "Attach to Server" and run
```

### Console Logging

All auth routes have debug logging:
```typescript
console.log('[api:auth:me] Cookie header present:', !!cookieHeader);
console.log('[api:auth:me] User found:', user.id, user.email);
```

View logs in:
- VS Code Debug Console (if debugging)
- Server terminal (if running `npm run dev`)
- Browser DevTools Console (for client-side code)

---

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional, for admin operations
```

Get these from:
- Supabase Dashboard → Settings → API
- Copy Project URL and Keys

---

## File Structure

```
.vscode/
├── tasks.json       ← Development tasks (npm scripts)
├── launch.json      ← Debugger configurations
└── settings.json    ← Editor settings & formatting

src/
├── app/
│   ├── auth/
│   │   └── callback/route.ts       ← OAuth callback handler
│   ├── api/auth/
│   │   ├── login/route.ts          ← POST login endpoint
│   │   ├── logout/route.ts         ← POST logout endpoint
│   │   ├── signup/route.ts         ← POST signup endpoint
│   │   └── me/route.ts             ← GET current user endpoint
│   └── ...
├── lib/
│   └── supabase/
│       ├── server.ts               ← Server client + createApiRouteClient()
│       └── client.ts               ← Browser client
└── middleware.ts                   ← Auth middleware for protected routes
```

---

## Common Tasks

### Start Developing
```bash
# 1. Set up environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open browser
# Navigate to http://localhost:3000
```

### Deploy to Production
```bash
# 1. Build locally to verify
npm run build

# 2. Push to GitHub
git add .
git commit -m "Your message"
git push origin main

# 3. Vercel auto-deploys on push
# Check deployment at: vercel.com/dashboard
```

### Fix Build Issues
```bash
# 1. Clean everything
rm -r .next node_modules/.cache

# 2. Rebuild
npm run build

# 3. Check for TypeScript errors
npx tsc --noEmit
```

---

## Troubleshooting

### Dev server won't start
```bash
# Kill existing processes
npx lsof -ti:3000 | xargs kill -9    (macOS/Linux)
Get-Process -Id (netstat -ano | Select-String ":3000" | ForEach-Object {$_.Split()[4]}) | Stop-Process  (Windows)

# Restart
npm run dev
```

### Auth endpoints return 401
1. Verify env vars are set: `echo $NEXT_PUBLIC_SUPABASE_URL`
2. Check Supabase dashboard: Authentication → URL Configuration
3. Ensure Site URL matches localhost:3000 or your domain
4. Clear browser cookies and retry

### TypeScript errors in editor
```bash
# Restart TypeScript server in VS Code
# Command Palette (Ctrl+Shift+P) → "TypeScript: Restart TS Server"

# Or rebuild type definitions
npm run build
```

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [VS Code Task Documentation](https://code.visualstudio.com/docs/editor/tasks)

---

Last updated: February 5, 2026
