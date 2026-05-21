# NOST MATH TEST — Setup Guide

## Stack
- **Frontend + Backend**: Next.js (Vercel)
- **Database**: Supabase (Postgres + Realtime)

---

## Step 1: Supabase Setup

1. Go to https://supabase.com and create a new project
2. Once created, go to **SQL Editor** and paste the contents of `supabase_schema.sql` — run it
3. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

---

## Step 2: Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Step 3: Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → New Project → Import your repo
3. Add the 3 environment variables in Vercel's project settings
4. Deploy!

---

## Usage

### Student Flow
1. Student goes to `your-site.vercel.app`
2. Enters student code + first name
3. Confirms info → Waiting for approval screen
4. Admin approves → Student enters exam (fullscreen)
5. **Ctrl+Delete** = exits and terminates session

### Admin Flow
1. Go to `your-site.vercel.app/admin_password`
2. Password: `TECLEDYT12`
3. Redirects to `/admin_view`

### Admin Can:
- ✅ Approve students to start exam
- ➕ Add new students with custom time limits
- 📊 View each student's time used vs limit
- 🎯 View current auto-calculated score
- 🚫 Disqualify students
- 🔄 Reset students

---

## Default Student (Pre-loaded)
- **Code**: `i11HHaE`  
- **Name**: `Izakiah`

---

## Notes
- Answers auto-save every **2 minutes** after activity
- Only saves if student has typed/selected something
- Multiple choice is auto-graded
- Short answer and extended response need manual review
- Fullscreen exit = warning overlay + violation counter
- Ctrl+Delete = permanent session termination
