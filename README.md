# POTENT — Setup & Deploy Guide

This is a full working app: freight board, post-a-load form with required photos,
flat-fee posting, rate-per-mile / Load Score calculator, and reviews. It's wired
to Supabase for the database and photo storage, and set up to deploy on Netlify
for free.

Total time if you follow this in order: about 15–20 minutes.

---

## 1. Create your Supabase project (free tier is fine)

1. Go to https://supabase.com → sign up / log in → **New Project**
2. Pick any name/region, set a database password (save it somewhere), wait ~2 min for it to spin up
3. Once it's ready, go to **SQL Editor** (left sidebar) → **New Query**
4. Open `supabase/schema.sql` from this project, copy the whole file, paste it into the SQL editor, click **Run**
   - This creates your `postings` and `reviews` tables, sets up permissions, and creates the `load-photos` storage bucket automatically
5. Go to **Project Settings → API** (left sidebar, gear icon)
6. Copy two values, you'll need them in step 3:
   - **Project URL**
   - **anon public** key

---

## 2. Run it locally first (recommended, so you can see it works before deploying)

You'll need [Node.js](https://nodejs.org) installed (any recent version).

```bash
cd potent-app
npm install
cp .env.example .env
```

Open `.env` and paste in your Supabase URL and anon key from step 1:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Then:

```bash
npm run dev
```

Open the local URL it gives you (usually `http://localhost:5173`). Try posting
a load with a photo — it should show up on the board, and you should see it
appear in Supabase under **Table Editor → postings**.

---

## 3. Push it to GitHub

```bash
cd potent-app
git init
git add .
git commit -m "POTENT v1"
```

Then on GitHub.com: **New Repository** → name it `potent` (or whatever you want) →
don't initialize with a README (you already have one) → create it. GitHub will
show you commands like this — run them:

```bash
git remote add origin https://github.com/YOUR-USERNAME/potent.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy on Netlify

1. Go to https://netlify.com → sign up / log in (you can use your GitHub account)
2. **Add new site → Import an existing project → connect to GitHub**
3. Pick the `potent` repo you just pushed
4. Build settings should auto-fill from `netlify.toml` (build command `npm run build`, publish directory `dist`) — leave them as is
5. Before deploying, go to **Site settings → Environment variables** and add the same two values from step 1:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy site**

Netlify will give you a live URL (something like `potent-xyz.netlify.app`) —
that's your app, live on the internet. You can add a custom domain later
under **Domain settings**.

---

## 5. Add Stripe (real payment collection for the $25 posting fee)

1. Go to https://stripe.com → create an account (test mode is on by default — good, use that first)
2. **Developers → API keys** → copy your **Secret key** (starts with `sk_test_...`)
3. In Netlify: **Site settings → Environment variables**, add:
   - `STRIPE_SECRET_KEY` = your secret key
   - `SUPABASE_URL` = same value as `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` = from Supabase **Project Settings → API → service_role** key
     (⚠️ this key bypasses all security rules — it must only ever live in Netlify env vars, never in `.env`, never committed to GitHub, never prefixed with `VITE_`)
4. Deploy the site once so the function URL exists
5. Back in Stripe: **Developers → Webhooks → Add endpoint**
   - Endpoint URL: `https://YOUR-SITE.netlify.app/api/stripe-webhook`
   - Event to send: `checkout.session.completed`
6. Stripe shows you a **Signing secret** (starts with `whsec_...`) — copy it into Netlify env vars as `STRIPE_WEBHOOK_SECRET`
7. Redeploy the site so it picks up the new env vars

**Test it:** post a load, you'll land on Stripe's checkout page, pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. You should land back on the board with a "payment received" banner, and the posting should appear (check Supabase Table Editor — `paid` should flip to `true`).

Switch from test keys to live keys in Stripe (and swap the Netlify env vars) once you're ready to take real payments.

---

## 6. Add the admin password (for moderating spam/abuse)

In Netlify → **Site settings → Environment variables**, add one more:
- `ADMIN_SECRET` = any password you make up (this is never shown in the app's code — it only lives server-side)

To access the admin panel once deployed, go to `https://YOUR-SITE.netlify.app/?admin` and enter that password. You'll see every posting (including unpaid/removed ones) and can remove anything spammy or abusive.

Redeploy after adding this env var.

---

## What's real right now vs. what's still a TODO

**Working right now:**
- Posting a load (with required photos, compressed automatically before upload, and requirement checkboxes — liftgate, dolly, etc.)
- Photos stored in Supabase Storage (cheap object storage, not your database)
- Browsing/filtering/searching the board — by category, vehicle, **and pickup state**
- Rate-per-mile + Load Score + fuel cost estimate, calculated live
- Reviews on each listing
- Contact info shown directly on the listing (no in-app chat, by design)
- **Real $25 flat-fee payment collection via Stripe Checkout** — postings stay hidden from the board until payment is confirmed
- **Click-to-enlarge photos** (lightbox) on the listing detail page
- **"My Postings"** page — lets whoever posted a load edit the price, mark it filled, reactivate it, or delete it, without needing an account. This works by remembering a private edit link in that browser's local storage — if they clear their browser data or switch devices, they lose access to edit that old posting (this is a normal tradeoff of the no-account model — flag it to them if it becomes a real pain point later)
- **Admin panel** (`/?admin`) — password-gated list of every posting with a remove button, for moderating spam/abuse
- **Auto-expiration** — handled for free with no extra job: expired postings simply stop showing up on the public board on their own (the database rule excludes them automatically)

**Not built yet:**
- Rate-limiting on posting/uploads (currently wide open — payment is a natural deterrent, but there's no hard limit on how many someone could post before paying)
- A "forgot my edit link" recovery flow (e.g. email lookup) — right now, losing local storage access to a posting means contacting you directly to have it removed via the admin panel


---

## Cost expectations

- Supabase free tier covers you for a long time at early-stage volume
  (500MB database, 1GB storage, plenty of bandwidth)
- Netlify free tier covers hosting for a typical early-stage app
- Photos are compressed client-side before upload (see `src/lib/resizeImage.js`),
  which is what keeps storage cheap as you scale — see the "Storage & Infra
  Cost Plan" in the build spec doc for the full reasoning

Realistically: **$0/month** until you have meaningful traffic, and still
likely under $20–30/month well past your first few hundred postings.
