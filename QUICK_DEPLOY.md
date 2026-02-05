# ⚡ QUICK DEPLOY REFERENCE

## 1. Configure Git (One-time)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

## 2. Commit & Prepare

```powershell
cd C:\Users\Quise\Downloads\auto-editor
git commit -m "Initial commit - production ready"
git branch -M main
```

## 3. Create GitHub Repo

- Go to: https://github.com/new
- Name: `auto-editor`
- Click "Create repository"

## 4. Push to GitHub

```powershell
# Replace YOUR_USERNAME
git remote add origin https://github.com/YOUR_USERNAME/auto-editor.git
git push -u origin main
```

## 5. Deploy to Vercel

1. https://vercel.com/new
2. Import `auto-editor` repo
3. Add env var: `SESSION_SECRET` (generate with command below)
4. Click "Deploy"

### Generate SESSION_SECRET:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

## 6. Verify

- ✅ Home: `https://your-site.vercel.app/`
- ✅ Pricing: `https://your-site.vercel.app/pricing`
- ✅ Health: `https://your-site.vercel.app/api/health`

## Future Updates

```powershell
git add .
git commit -m "Update X"
git push
```

Auto-deploys in 2-3 minutes!

---

**Full guide:** See `DEPLOY_STEPS.md`  
**Architecture:** See `DEPLOYMENT.md`

