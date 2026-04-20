# Sparkline

Sparkline is a full-stack catalog and inquiry platform for construction machinery. The frontend is built with React and Vite, and the backend is an Express API backed by MySQL.

## What The Project Includes

- Public catalog browsing for categories, products, brochures, gallery media, and spare-parts inquiry.
- User authentication with signup, login, password reset, and account-aware quote/brochure forms.
- Admin portal for inquiries, catalog management, gallery management, user management, tasks, and audits.
- Owner-level controls for admin account creation and destructive catalog actions.

## Stack Overview

- Frontend: React 19, Vite, React Router, Framer Motion
- Backend: Express 5, MySQL 8, file-based media uploads
- Database tables: categories, products, product specs, users, auth sessions, quotes, brochure leads, gallery items, admin tasks, audit logs, spare parts inventory

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the backend:

```bash
npm run dev:server
```

The frontend runs on Vite, and the backend runs on port `3000` by default.

## Production Build

Build the frontend:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

In production, the backend serves the built frontend from `/dist` and exposes the API from `/api`.

## Environment Variables

Create `/Users/devanshuverma/Desktop/sparkline/server/.env` from `/Users/devanshuverma/Desktop/sparkline/server/.env.example` and set:

- `PORT`
- `HOST`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_AUTO_CREATE=false` for Hostinger and other managed environments where the database is created in the control panel first
- `FRONTEND_URL`
- `APP_BASE_URL`
- `SMTP_*` values if email-based password reset is needed
- `OWNER_NAME`
- `OWNER_EMAIL`
- `OWNER_PASSWORD`
- `SEED_DEFAULT_ADMIN=false` to avoid creating demo admin users

## Reset Demo Data

To wipe inquiry/admin/demo activity while keeping categories, products, specifications, and the owner account:

```bash
npm run reset:data
```

This clears quote enquiries, brochure leads, gallery items, audit logs, admin tasks, sessions, password reset tokens, spare-parts inventory, and all non-owner users.

## Hostinger Deployment Notes

This repo is prepared to run as a single Node.js app on Hostinger.

### Screen 1: Add Website

Choose these exact values in Hostinger:

- Website type: `Node.js Apps`
- Import source: `Git repository`
- Repository: `https://github.com/dev19072004/Sparkline.git`

### Screen 2: Build Configuration

Use these exact values:

- Framework preset: `Other`
- Branch: `main`
- Node version: `22.x`
- Root directory: `./`

### Screen 3: Build and Output Settings

Use these exact values:

- Build command: `npm run build`
- Package manager: `npm`
- Output directory: `dist`
- Entry file: `server/src/server.js`

### Screen 4: Environment Variables

Use these exact keys. Replace the placeholder values with your real database and email values:

```env
HOST=0.0.0.0
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_AUTO_CREATE=false

FRONTEND_URL=https://sparklineindia.com
APP_BASE_URL=https://sparklineindia.com

MAIL_FROM=your-email@yourdomain.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password

OWNER_EMAIL=devanshuverma72@gmail.com
OWNER_PASSWORD=Dev@1907
OWNER_NAME=Devanshu Verma
OWNER_PHONE=9054606803
OWNER_COMPANY=Sparkline
OWNER_DESIGNATION=Owner

SEED_DEFAULT_ADMIN=false
```

Delete any `DEFAULT_ADMIN_*` variables if they exist in Hostinger. They are not needed when `SEED_DEFAULT_ADMIN=false`.

### Screen 5: After Deploy

After Hostinger finishes deployment, test these URLs:

- `https://sparklineindia.com/`
- `https://sparklineindia.com/healthz`
- `https://sparklineindia.com/sitemap.xml`
- `https://sparklineindia.com/robots.txt`

Important deployment behavior:

- The frontend uses `/api` automatically in production.
- Static media in `/public` is served by the backend.
- `robots.txt` is served from `/public/robots.txt`.
- `sitemap.xml` is generated dynamically from the live database.
- Hostinger only needs one root install now. There is no nested `server` package install anymore.
- Catalog/category/product data is seeded automatically if the database is empty.
- Default demo admin creation is disabled unless `SEED_DEFAULT_ADMIN=true` is explicitly set.

## Google Indexing Checklist

Once the site is live:

1. Open Google Search Console and add the `sparklineindia.com` domain property.
2. Verify ownership using the DNS record Google gives you.
3. Submit `https://sparklineindia.com/sitemap.xml`.
4. Request indexing for the homepage and a few key category and product pages.
5. Keep `robots.txt` accessible at `https://sparklineindia.com/robots.txt`.

Google may still take days or weeks to fully index the site, but these steps are the correct setup.
