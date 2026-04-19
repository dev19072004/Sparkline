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

The frontend runs on Vite, and the backend runs on port `5050` by default.

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
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_AUTO_CREATE=false` for Hostinger and other managed environments where the database is created in the control panel first
- `FRONTEND_URL`
- `APP_BASE_URL`
- `JWT_SECRET`
- `SMTP_*` values if email-based password reset is needed
- `OWNER_NAME`
- `OWNER_EMAIL`
- `OWNER_PASSWORD`
- `SEED_DEFAULT_ADMIN=false` to avoid creating demo admin users

## Reset Demo Data

To wipe inquiry/admin/demo activity while keeping categories, products, specifications, and the owner account:

```bash
npm --prefix server run reset:data
```

This clears quote enquiries, brochure leads, gallery items, audit logs, admin tasks, sessions, password reset tokens, spare-parts inventory, and all non-owner users.

## Hostinger Deployment Notes

This repo is prepared to run as a single Node.js app on Hostinger:

1. Upload the project with both the root app and the `server` folder.
2. Set the Node.js startup command to `npm start`.
3. Run `npm install` in the project root. The root `postinstall` also installs backend dependencies.
4. Build the frontend with `npm run build`.
5. Configure the environment variables from `server/.env`.
6. Point the domain to the Node.js app. The Express server will serve the built frontend and all `/api` routes.

Important deployment behavior:

- The frontend uses `/api` automatically in production.
- Static media in `/public` is served by the backend.
- Catalog/category/product data is seeded automatically if the database is empty.
- Default demo admin creation is disabled unless `SEED_DEFAULT_ADMIN=true` is explicitly set.
