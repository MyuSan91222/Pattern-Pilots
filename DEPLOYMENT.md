 Deployment Guide - Make Your App Available Online /

This guide explains how to deploy the Attendance Analyzer app so it's always available online.

---

 Option : Deploy to Render (RECOMMENDED - Easiest)

 Why Render?
- ✅ Free tier available (app sleeps after  mins of inactivity)
- ✅ Paid tier: $/month for always-on app
- ✅ Simple deployment from GitHub
- ✅ Automatic SSL/HTTPS
- ✅ Environment variables management
- ✅ Automatic deployments on git push

 Steps:

 . Push your project to GitHub
```bash
 If not already a git repo
git init
git add .
git commit -m "Initial commit - ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/attendance-analyzer.git
git push -u origin main
```

 . Create a Render Account
- Go to https://render.com
- Sign up (free account)
- Connect your GitHub account

 . Deploy the App
- Click "New +" → "Web Service"
- Connect your GitHub repo
- Configure:
  - Name: `attendance-analyzer`
  - Environment: `Node`
  - Build Command: `npm run build:client`
  - Start Command: `npm start`
  - Plan: "Free" (or "Standard" for always-on at $/month)

 . Add Environment Variables
In Render dashboard, go to "Environment" and add:
```
JWT_SECRET=generate-a-random--character-string
JWT_REFRESH_SECRET=generate-another-random--character-string
ADMIN_EMAILS=your@email.com
REQUIRE_EMAIL_VERIFICATION=false
NODE_ENV=production
```

 . Update Your Server Config
Update `server/.env` for production:
```env
JWT_SECRET=your-generated-secret
JWT_REFRESH_SECRET=your-generated-secret
ADMIN_EMAILS=your@email.com
CLIENT_URL=https://your-app-name.onrender.com
```

Result: Your app will be live at `https://your-app-name.onrender.com`

---

 Option : Deploy to Railway.app

 Why Railway?
- ✅ $/month credit (free for small projects)
- ✅ Better dashboard than Render
- ✅ Good database support
- ✅ Built-in PostgreSQL support

 Steps:

 . Create Railway Account
- Go to https://railway.app
- Sign up with GitHub

 . Deploy
- Click "New Project" → "Deploy from GitHub"
- Select your `attendance-analyzer` repo
- Wait for auto-deployment

 . Add Environment Variables
- Go to project → "Variables"
- Add the same env vars as above

 . Configure Port
- Railway auto-assigns PORT, make sure your `index.js` reads it: ✅ Already configured!

Result: Get your Railway domain from the dashboard

---

 Option : Deploy to Heroku (Alternative)

Note: Heroku free tier ended, but paid dynos start at $/month

 Quick Setup:
```bash
npm install -g heroku
heroku login
heroku create your-app-name
heroku config:set JWT_SECRET=your-secret
heroku config:set JWT_REFRESH_SECRET=your-secret
git push heroku main
```

---

 Option : DigitalOcean App Platform (Production-Ready)

 Why DigitalOcean?
- ✅ $-/month depending on resource
- ✅ Most reliable, production-ready
- ✅ Full control over environment
- ✅ Good documentation

 Steps:

 . Create DigitalOcean Account
- Go to https://digitalocean.com
- Sign up

 . Create App Platform Project
- Click "Create" → "App"
- Connect GitHub repo
- Choose Node as runtime
- Set build command: `npm run build:client`
- Set run command: `npm start`

 . Add Database (optional)
- DigitalOcean → "Managed Databases" → "Create PostgreSQL"
- This replaces SQLite for production

 . Set Environment
```
PORT=
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
ADMIN_EMAILS=your@email.com
NODE_ENV=production
```

---

 Keep App Always Running (Avoid Sleep)

 On Render (Free Plan Issue):
Free tier apps go to sleep after  minutes. Paid solutions:

Option A: Upgrade to "Standard" plan ($/month) → Always-on
Option B: Use a cron job to ping your app every  minutes:
- Create a free account on https://cron-job.org
- Set it to GET `https://your-app.onrender.com/api/health` every  minutes
- This keeps your app awake (free tier)

 Best Solution: Use Railway or DigitalOcean
Both keep apps running / for under $/month

---

 Database: Local SQLite vs Cloud

Your app currently uses SQLite (local file-based database).

 For Production Deployment:

Option : Keep SQLite (Simple)
- ✅ Works on Render, Railway, DigitalOcean
- ✅ No additional cost
- ✅ Data persists between restarts
- ⚠️ File stored on server's ephemeral storage (may be lost if server resets)

Option : Move to PostgreSQL (Recommended)
- ✅ Proper database for production
- ✅ Data guaranteed to persist
- ✅ Better performance, backups, security
- 🔧 Requires code changes
- 💰 Usually $+/month on all platforms

 Recommendation:
Start with SQLite on Render/Railway (Free/Cheap) → If popular, upgrade to PostgreSQL later.

---

 Post-Deployment Checklist

After deploying:

- [ ] Visit your live URL and verify it works
- [ ] Test signup/login with real email
- [ ] Test file upload and analysis
- [ ] Test exports (CSV, PDF)
- [ ] Check that admin panel works
- [ ] Set strong JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Update admin email to your real email
- [ ] Test password reset flow (if using SMTP)
- [ ] Monitor logs for errors

---

 Troubleshooting

 App won't start?
```bash
 Check server logs on platform dashboard
 Common issues:
. Missing environment variables
. PORT not set correctly
. Build command failed
. Missing node_modules
```

 CORS errors?
Make sure `CLIENT_URL` matches your deployed frontend URL

 Database errors?
Check that `~/.attendance-analyzer/app.db` has write permissions

  Bad Gateway?
Server crashed → check logs. Usually:
- Missing env variables
- Port conflicts
- Memory issues

---

 Scaling Later

Once your app is popular:

. Add Redis for sessions/caching
. Switch to PostgreSQL for better database
. Use CDN (Cloudflare) for static files
. Add monitoring (Sentry, DataDog)
. Load balancing if needed

---

 Summary: Recommended Path

. Week -: Deploy to Render Free with cron job to prevent sleep
. Week +: If users complain about sleep, upgrade to Render Standard ($/month)
. Month +: If database issues, switch to Railway with PostgreSQL ($-/month)

---

Next Step: Push your code to GitHub and follow the Render deployment steps above! 🚀

