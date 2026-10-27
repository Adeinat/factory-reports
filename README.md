# Factory Daily Reports: Setup Guide

This is the same setup as the SCM mock exam: the pages live on **GitHub Pages** and the data lives in **Supabase**. Both are free.

* **Employees** open a link and send their report. They need no account and no login.
* **You** sign in to the dashboards with your email and password. Only emails on your managers list can see any data.

Total time: about 25 minutes.

---

## What's in this folder

| File | What it is |
|---|---|
| `supabase_setup.sql` | Creates the database. You run it once in Supabase. |
| `config.js` | **The only file you edit:** two Supabase values. |
| `index.html` | Employee start page (pick a department) |
| `accounting.html`, `sales.html`, `production.html`, `inventory.html` | Employee forms |
| `admin.html` | Manager start page |
| `admin-accounting.html`, `admin-sales.html`, `admin-production.html`, `admin-inventory.html` | Manager dashboards |

---

## STEP 1: Create a Supabase project (3 min)

1. Go to **supabase.com** and sign in. You can use the same account as the exam.
2. Click **New project**. Name it `factory-reports` and choose a database password (save it somewhere).
3. Choose a region close to Jordan, for example Frankfurt.
4. Wait about 2 minutes for the project to be created.

Use a **new project**, not the exam project, so the factory data stays separate from student data.

## STEP 2: Create the database (3 min)

1. Open `supabase_setup.sql` in Notepad.
2. At the bottom, replace `PASTE_MANAGER_EMAIL` with the email you will sign in with.
3. Optional: put an access code between the quotes in `('form_pin', '')`, for example `('form_pin', '4821')`. Employees will then need this code to submit, which stops strangers from sending fake reports. Leave it as `''` for no code.
4. In Supabase, click **SQL Editor**, then **New query**. Paste the whole file and click **Run**.
5. You should see: `Setup complete`.

## STEP 3: Create your manager login (3 min)

1. In Supabase, go to **Authentication** → **Sign In / Providers** (or **Settings**), and **turn off "Allow new users to sign up"**. This is important: it stops anyone else from creating an account.
2. Go to **Authentication** → **Users** → **Add user** → **Create new user**.
3. Enter the **same email** as in Step 2 and a strong password. Tick **Auto Confirm User**.
4. Click **Create user**.

## STEP 4: Copy your Supabase keys (2 min)

1. Go to **Project Settings** → **API** (or **API Keys**).
2. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`).
3. Copy the **anon public** key (a long string starting with `eyJ...`).

## STEP 5: Fill in config.js (1 min)

Open `config.js` in Notepad and replace:

* `PASTE_SUPABASE_URL` → your Project URL
* `PASTE_SUPABASE_ANON_KEY` → your anon key

Save the file. The anon key is meant to be public. It can only call the two safe actions (load the drop-down names and send a report). It can never read reports.

## STEP 6: Upload to GitHub Pages (5 min)

1. Go to **github.com**, sign in, and click **New repository**.
2. Name it `factory-reports` and set it to **Public**. Public is required for free GitHub Pages. Only the page files are public; no reports and no passwords are stored there.
3. Click **Create repository**, then **uploading an existing file**.
4. Drag in **all the files** from this folder (all the `.html` files and `config.js`). You don't need to upload the `.sql` file or this README.
5. Click **Commit changes**.
6. Go to **Settings** → **Pages**. Under **Source**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then click **Save**.
7. Wait 1 to 2 minutes.

## STEP 7: Your links

With your GitHub username, for example `adeinat`:

| Who | Link |
|---|---|
| All employees | `https://adeinat.github.io/factory-reports/` |
| Finance | `https://adeinat.github.io/factory-reports/accounting.html` |
| Sales | `https://adeinat.github.io/factory-reports/sales.html` |
| Production | `https://adeinat.github.io/factory-reports/production.html` |
| Inventory | `https://adeinat.github.io/factory-reports/inventory.html` |
| **You (manager)** | `https://adeinat.github.io/factory-reports/admin.html` |

## STEP 8: Test and go live (5 min)

1. Open `admin.html`, choose **Sales**, and sign in.
2. Open **الإعدادات والأهداف (Settings)** at the bottom. Add your reps with their monthly and daily targets, plus your products and areas. Click **Save settings**.
3. Do the same on the other dashboards:
   * **Finance:** the reps list
   * **Production:** lines with their daily target, and products
   * **Inventory:** raw materials with minimum stock and lead time in days, and products
4. Open `sales.html` on your phone and send one test report. It should appear on the dashboard within 30 seconds.
5. Delete the test report from **Latest submissions** on the dashboard.
6. Send each team its link on WhatsApp.

---

## Good to know

* **Excel:** every dashboard has a **Download for Excel (CSV)** link with all of that department's reports.
* **Backup:** download the CSV from each dashboard once a week and keep the files in Google Drive.
* **Free plan sleep:** Supabase pauses a free project after about a week with no activity. Daily reports keep it awake. If it ever pauses, open the project in Supabase and click **Restore**. Your data is kept.
* **Change the access code:** in Supabase, go to **Table Editor** → `app_config` and edit the value of `form_pin`.
* **Add another manager:** add their email in **Table Editor** → `managers`, then create their user in **Authentication** → **Users** (Step 3).
* **Forgot your password:** in **Authentication** → **Users**, click your user and send a password reset, or delete the user and create it again.
