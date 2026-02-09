# 🚀 FIRST STEPS - START HERE

**Welcome!** Your Supabase Auth + Stripe checkout integration is complete and build-verified. This guide walks you through the FIRST STEPS to get everything running.

---

## ⏱️ Timeline: ~30 minutes to fully working local setup

### Step 1: Create Supabase Project (5 min)

**Go to**: https://supabase.com/dashboard

1. Click **New Project**
2. Fill in:
   - Name: `auto-editor`
   - Region: Choose closest to you
   - Password: Create a strong password (you won't need it again)
3. Click **Create new project**
4. ⏳ Wait ~2 minutes for provisioning (you'll see "Provisioning..." spinner)
5. When done, you'll see your project dashboard

---

### Step 2: Deploy Database Schema (2 min)

**In Supabase Dashboard**:

1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy everything from this file: `supabase/schema.sql`
   - Open the file in your code editor
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)
4. Paste into Supabase SQL Editor
5. Click **RUN** (top right button)
6. You should see: `Query executed successfully`

✅ Your database tables are now created!

---

### Step 3: Get Your Credentials (1 min)

**In Supabase Dashboard**:

1. Go to **Settings** → **API** (left sidebar)
2. You'll see three keys:
   - Project URL (starts with https://)
   - Anon (public) key (starts with eyJ...)
   - Service role key (starts with eyJ..., longer)

**Copy these into a text file temporarily** (you'll paste into .env.local next)

---

### Step 4: Configure Supabase Auth Callback URLs (2 min)

**In Supabase Dashboard**:

1. Go to **Settings** → **Auth** (left sidebar)
2. Under "Site URL", set to: `http://localhost:3000`
3. Under "Redirect URLs", add BOTH:
   ```
   http://localhost:3000/auth/callback
   https://autoeditor.app/auth/callback
   ```
4. Click **Save**

(The second URL is for production - we'll use it later)

---

### Step 5: Create .env.local File (3 min)

**In your project folder** (`c:\Users\Quise\Downloads\auto-editor`):

1. Open `.env.example` (you'll see it in the file explorer)
2. Create a NEW file: `.env.local`
3. Copy the ENTIRE contents of `.env.example` into `.env.local`
4. Now paste your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<paste Project URL from step 3>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste Anon key from step 3>
   SUPABASE_SERVICE_ROLE_KEY=<paste Service role key from step 3>
   ```
5. For Stripe keys, use these TEST keys (from Stripe Dashboard):
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<your key>
   STRIPE_SECRET_KEY=sk_test_<your key>
   STRIPE_PRICE_STARTER=price_<from Stripe Products page>
   STRIPE_PRICE_CREATOR=price_<from Stripe Products page>
   STRIPE_PRICE_STUDIO=price_<from Stripe Products page>
   ```
6. Save the file

✅ Your `.env.local` is ready!

---

### Step 6: Start Development Server (1 min)

**In terminal**:

```bash
cd c:\Users\Quise\Downloads\auto-editor
npm run dev
```

You should see:
```
> next dev

  ▲ Next.js 16.1.6
  - Local: http://localhost:3000
  ✓ Ready in 2.1s
```

---

### Step 7: Test Signup (5 min)

**In browser**:

1. Go to: http://localhost:3000/login
2. Click **"Sign Up"** button
3. Fill in:
   - Email: `test@example.com`
   - Password: `password123`
4. Click **"Sign Up"**
5. You should be redirected to: http://localhost:3000/editor

✅ **SIGNUP WORKS!**

**Verify in Supabase**:
1. Go to: https://supabase.com/dashboard/project/[ID]/editor
2. Select **profiles** table
3. You should see your test user!

---

### Step 8: Test Checkout (5 min)

**In browser**:

1. Stay logged in at http://localhost:3000/editor
2. Go to: http://localhost:3000/pricing
3. Click **"Subscribe"** on any plan (Starter, Creator, or Studio)
4. You should be redirected to Stripe Checkout page
5. Fill in:
   - Card: `4242 4242 4242 4242` (Stripe test card)
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Name: Anything
   - Email: Your test email
6. Click **"Pay"**
7. You should be redirected to: http://localhost:3000/billing/success

✅ **CHECKOUT WORKS!**

**Verify in Stripe**:
1. Go to: https://dashboard.stripe.com/test/customers
2. You should see your test customer!

---

## 🎉 Local Setup Complete!

**You now have**:
- ✅ Working signup/login
- ✅ Working checkout
- ✅ Working database
- ✅ User profiles created automatically
- ✅ Subscriptions tracked

---

## 📖 Next: Production Deployment (Optional Now, Do Later)

When ready to go live on Vercel, follow: **SUPABASE_AUTH_STRIPE_SETUP.md** (Part 4: Vercel Deployment)

Key steps:
1. Add 13 env vars to Vercel
2. Update Supabase Site URL to production domain
3. Push to GitHub
4. Test production

---

## 🆘 Troubleshooting

### "Cannot find .env.local"
- Make sure you created `.env.local` in the project root folder
- NOT inside src/ or anywhere else
- Restart `npm run dev` after creating it

### "Signup doesn't work"
- Check browser console (F12 → Console)
- Check terminal running `npm run dev` for errors
- Make sure Supabase keys are correct (copy-paste from Settings → API)
- Make sure schema deployed (run `SELECT * FROM profiles;` in Supabase SQL Editor)

### "Checkout redirects to error"
- Check Stripe keys are correct (must be TEST keys, pk_test_...)
- Make sure STRIPE_PRICE_* vars are set
- Check Stripe Products page - verify 3 products exist

### "Redirect to /auth/callback fails"
- Check Supabase Settings → Auth → Site URL is `http://localhost:3000`
- Check Redirect URLs includes `http://localhost:3000/auth/callback`
- Restart `npm run dev` after changing

### "Module not found errors"
- Run: `npm install`
- Delete `node_modules` folder and `.next` folder
- Run: `npm install` again
- Run: `npm run dev`

---

## 📚 Documentation

For more details, see:

- **SUPABASE_AUTH_STRIPE_SETUP.md** - Complete implementation guide
- **QUICK_REFERENCE.md** - Commands, links, and quick lookups
- **IMPLEMENTATION_CHECKLIST.md** - Full task tracking

---

## ✨ You're All Set!

**Your application now has**:
- ✅ Supabase authentication
- ✅ Route protection (users can't access /editor without login)
- ✅ Database (profiles + subscriptions)
- ✅ Stripe checkout
- ✅ Production-ready code

**The hard part is done!** 🎉

---

**Questions?** Check the troubleshooting section above or look in SUPABASE_AUTH_STRIPE_SETUP.md.

**Next step?** Continue using the app locally, or when ready, deploy to Vercel using Part 4 of the setup guide.
