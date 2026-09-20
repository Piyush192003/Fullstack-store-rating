# StoreScope — Fullstack Store Rating App

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express 5 + Mongoose (MongoDB)
- **Auth:** JWT (bcrypt-hashed passwords) + role-based access control + one-click guest logins

---

## Deployment topology

| Piece    | Host          | Notes                                          |
|----------|---------------|------------------------------------------------|
| Frontend | **Vercel**    | Root `vercel.json` builds `FrontEnd/myapp`     |
| Backend  | **Heroku**    | `BackEnd/Procfile` → `web: node index.js`      |
| Database | **MongoDB Atlas** | Free M0 cluster is enough to start         |

---

## 1. MongoDB Atlas (do this first)

1. Create a free account at <https://cloud.mongodb.com> → build an **M0 (free)** cluster.
2. **Database Access** → add a database user (username + password). Save them.
3. **Network Access** → add IP rule `0.0.0.0/0` (Allow from anywhere) — required for Heroku.
4. Get the connection string: **Connect → Drivers**, it looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Add the database name before the `?`: `...mongodb.net/store_rating_db?retryWrites=true...`
   Collections + indexes are created automatically on first start.

---

## 2. Heroku backend

From the `BackEnd` folder:

```bash
heroku login
heroku create storescope-api            # pick any unique name
heroku git:remote -a storescope-api

# Required config vars
heroku config:set MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/store_rating_db?retryWrites=true&w=majority"
heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
heroku config:set FRONTEND_URL="https://<your-vercel-app>.vercel.app"   # set after step 3

git subtree push --prefix BackEnd heroku main
# (or, from inside BackEnd with its own git repo: git push heroku main)
```

Create the first admin account (there is no auto-seeding):

```bash
# One-off dyno on Heroku:
heroku run "node scripts/create-admin.js admin@example.com 'YourStrongPass' 'Admin'"
```

Verify: `https://<your-api>.herokuapp.com/api/health` → `{"ok":true}`

> Note: images upload to the dyno's ephemeral disk — they reset on each deploy/restart.
> For permanent image storage, plug in Cloudinary/S3 later.

---

## 3. Vercel frontend

1. Import the GitHub repo into Vercel — `vercel.json` at the repo root auto-detects
   `FrontEnd/myapp`, builds it and enables SPA routing.
2. In **Project → Settings → Environment Variables** add:

   | Name           | Value                                             |
   |----------------|---------------------------------------------------|
   | `VITE_API_URL` | `https://<your-api>.herokuapp.com/api`            |

3. Redeploy (Deployments → ⋯ → Redeploy) so the variable is baked into the build.
4. Go back to Heroku and make sure `FRONTEND_URL` matches your Vercel URL.

---

## 4. Environment variables summary

**Heroku (backend)**

| Var            | Value                                        |
|----------------|----------------------------------------------|
| `MONGODB_URI`  | Atlas connection string incl. db name        |
| `JWT_SECRET`   | long random string                           |
| `FRONTEND_URL` | your Vercel URL (CORS allow-list)            |

**Vercel (frontend)**

| Var            | Value                                        |
|----------------|----------------------------------------------|
| `VITE_API_URL` | `https://<your-api>.herokuapp.com/api`       |

---

## Guest login feature

The login page has two extra buttons: **👤 Login as Guest User** and
**🏪 Login as Guest Owner** (`POST /api/auth/guest-login`).

- Creates a temporary account instantly — no email/password needed.
- Guest **owners** get a live demo store pre-created so the owner dashboard works end-to-end.
- Guest accounts are flagged `isGuest: true` and **auto-expire after 24h**;
  expired guests and all their data (store, ratings, favorites, notifications)
  are cleaned up automatically on the next guest login.

---

## Local development

```bash
# Backend (needs a local MongoDB or a local .env pointing at Atlas)
cd BackEnd
cp .env.example .env         # set MONGODB_URI
npm install
npm run dev                  # http://localhost:5000/api

# Frontend
cd FrontEnd/myapp
npm install
npm run dev                  # http://localhost:5173
```

## Tests

```bash
cd BackEnd
npm test    # spins up an in-memory MongoDB, no setup needed
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MongooseServerSelectionError` on Heroku | Atlas Network Access must allow `0.0.0.0/0`; check `MONGODB_URI` (password URL-encoded). |
| CORS errors in the browser | Set Heroku `FRONTEND_URL` to your exact Vercel origin (no trailing slash). |
| API calls hit `localhost` on Vercel | `VITE_API_URL` missing → add it and **redeploy**. |
| First admin | `heroku run "node scripts/create-admin.js <email> <password>"` |
