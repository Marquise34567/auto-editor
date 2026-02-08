# GitHub Push Guide

## Quick Command Reference

```bash
# Navigate to project
cd c:\Users\Quise\Downloads\auto-editor

# Check status
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add Supabase Auth + Stripe checkout integration

- Implement Supabase authentication (signup/login/logout)
- Create Supabase clients (browser, server, auth helpers)
- Add route protection middleware for /editor and /generate
- Create Stripe checkout session endpoint
- Create webhook handler placeholder with TODO comments
- Add auth callback route for Supabase redirects
- Update auth APIs to use Supabase instead of demo system
- Add comprehensive setup guide (SUPABASE_AUTH_STRIPE_SETUP.md)
- Maintain all existing UI/styling (no breaking changes)"

# Push to GitHub
git push origin main
```

## Detailed Steps

### 1. Check Git Status

```bash
git status
```

**Expected output**: Shows all modified/new files in red/green

### 2. Stage Changes

```bash
git add .
```

This stages ALL changes (files, deletions, modifications).

### 3. View What You're Committing

```bash
git diff --cached --stat
```

Shows summary of what will be committed.

### 4. Commit

```bash
git commit -m "feat: Add Supabase Auth + Stripe checkout integration

- Implement Supabase authentication (signup/login/logout)
- Create Supabase clients (browser, server, auth helpers)
- Add route protection middleware for /editor and /generate
- Create Stripe checkout session endpoint
- Create webhook handler placeholder with TODO comments
- Add auth callback route for Supabase redirects
- Update auth APIs to use Supabase instead of demo system
- Add comprehensive setup guide (SUPABASE_AUTH_STRIPE_SETUP.md)
- Maintain all existing UI/styling (no breaking changes)"
```

### 5. Push to GitHub

```bash
git push origin main
```

**Expected output**:
```
Enumerating objects: 20, done.
Counting objects: 100% (20/20), done.
Delta compression using up to 8 threads
Compressing objects: 100% (15/15), done.
Writing objects: 100% (15/15), 45.23 KiB | 2.25 MiB/s, done.
Total 20 (delta 12), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (12/12), done.
To https://github.com/your-username/auto-editor.git
   abc1234..xyz9999  main -> main
```

### 6. Verify on GitHub

1. Go to https://github.com/your-username/auto-editor
2. You should see the commit in the commit history
3. Click on the commit to see the files changed

## Files Changed Summary

```
 10 files changed, 512 insertions(+), 145 deletions(-)

Rewrite:
- src/app/api/auth/login/route.ts
- src/app/api/auth/signup/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/auth/me/route.ts

New Files:
- middleware.ts
- src/lib/supabaseClient.ts
- src/lib/supabaseServer.ts
- src/lib/auth.ts
- src/app/auth/callback/route.ts
- src/app/api/stripe/checkout/route.ts
- src/app/api/stripe/webhook/route.ts
- SUPABASE_AUTH_STRIPE_SETUP.md

Modified:
- .env.example
```

## Verify Files Are on GitHub

After pushing, verify each file exists:

1. **Browser**: Go to GitHub repo > click files in file tree
2. **Or via command**:

```bash
# Verify remote has your branch
git branch -r

# Check specific file on remote
git ls-tree -r origin/main | grep "src/lib/supabaseClient.ts"
```

## Troubleshooting

### "fatal: not a git repository"
```bash
# Initialize git if needed
git init
git remote add origin https://github.com/your-username/auto-editor.git
git fetch origin
git checkout main
```

### "Permission denied (publickey)"
- Add SSH key to GitHub: https://github.com/settings/keys
- Or use HTTPS with personal access token

### "Your branch is behind"
```bash
git pull origin main
git push origin main
```

### Undo Last Commit (if needed)
```bash
# Keep changes locally
git reset --soft HEAD~1

# Or discard changes entirely
git reset --hard HEAD~1
```

## GitHub Actions Check

After push, GitHub may run automated checks:

- ✅ Build test (npm run build should pass)
- ✅ Linting (eslint)
- ⚠️ If CI fails, check the logs and fix issues

---

**Command Template for Quick Copy**:

```powershell
cd c:\Users\Quise\Downloads\auto-editor; `
git add .; `
git commit -m "feat: Add Supabase Auth + Stripe checkout integration"; `
git push origin main; `
git log --oneline -5
```

This PowerShell command:
1. Changes to project directory
2. Stages all changes
3. Commits with message
4. Pushes to GitHub
5. Shows last 5 commits to verify
