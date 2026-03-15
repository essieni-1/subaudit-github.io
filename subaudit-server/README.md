# SubAudit Server

Backend for SubAudit — handles Plaid bank connection and subscription detection.

## Setup

### 1. Install dependencies
```bash
cd subaudit-server
npm install
```

### 2. Your .env is already configured with your Plaid keys.

### 3. Run locally
```bash
npm run dev
```
Server starts at http://localhost:3001

---

## Deploy to Railway (free hosting)

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `subaudit-server` repo
4. Go to **Variables** tab and add:
   - `PLAID_CLIENT_ID` = your client id
   - `PLAID_SECRET` = your sandbox secret
   - `PLAID_ENV` = sandbox
5. Railway gives you a URL like `https://subaudit-server.up.railway.app`
6. Update `API_URL` in your frontend `js/app.js` to that URL

---

## Frontend Changes Needed

### In `index.html`, add Plaid Link script in `<head>`:
```html
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
```

### Change the hero CTA button to have an id:
```html
<a href="#" class="btn-primary" id="connect-bank-btn">Connect your bank free →</a>
```

### Replace contents of `js/app.js` with `frontend-app.js` from this folder.

### Add contents of `results-styles.css` to bottom of `css/styles.css`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Health check |
| POST | /api/create-link-token | Start Plaid Link flow |
| POST | /api/exchange-token | Exchange public token |
| POST | /api/subscriptions | Get detected subscriptions |

---

## Going to Production

When you're ready to go live (real banks, not sandbox):
1. Apply for Plaid Production access at dashboard.plaid.com
2. Change `PLAID_ENV=production` in Railway variables
3. Update `PLAID_SECRET` to your production secret
