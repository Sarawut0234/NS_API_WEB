# NS SYSTEM (Next.js Full Migration)

This folder contains the full migration from legacy PHP to Next.js.

## Migrated features

- Landing page
- Login/Register (email+password)
- Discord OAuth login
- Dashboard product store
- Cart add/remove/checkout with point deduction and stock checks
- Purchase history + IP update (Railway/local license DB)
- Redeem code (product/points)
- Secure local file download for owned products
- Admin panel:
  - Dashboard stats
  - Product CRUD
  - Key management (create/delete/list)
  - Orders list + mark paid
  - Points add by email + users points list
  - User role management

## Database compatibility

- Uses existing MySQL schema from `./sql/schema.sql`.
- MySQL still handles store/order/points transactions (`products`, `orders`, `user_products`) for compatibility.
- Supports separate DB targets:
  - App/User/Store DB: local `DB_*` or Railway `RAILWAY_APP_DB_*`.
  - License verification DB: Railway `RAILWAY_LICENSE_DB_*` (or backward-compatible `RAILWAY_DB_*`).
- Keeps license verification API:
  - `GET /api/license/verify?license_key=...&script_name=...&ip=...`

## Environment setup

1. Copy env:

   ```bash
   cp .env.local.example .env.local
   ```

2. Fill values in `.env.local`:
   - Main DB (required): `DB_*` or enable Railway app DB via `RAILWAY_APP_DB_ENABLED=true` + `RAILWAY_APP_DB_*`
   - Railway licenses DB (optional): `RAILWAY_LICENSE_DB_*` (or old `RAILWAY_DB_*`)
   - Discord OAuth (optional): `DISCORD_*`
   - Session secret: `SESSION_SECRET`
   - Admin fallback emails: `ADMIN_EMAILS` (comma-separated)

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build check

```bash
npm run build
```
