# Lost & Found App

A React + TypeScript + Vite web application for managing lost and found items across campus locations. Uses Supabase as the backend (auth, database, storage, and edge functions).

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Build tool**: Vite
- **Package manager**: npm

## Project Structure

- `src/components/` — UI components (admin dashboard, item forms, staff management, etc.)
- `src/context/` — React context (auth)
- `src/lib/` — Supabase client, utility helpers (dates, display, formatting, campus, brand)
- `src/pages/` — Route-level page components

## Environment Variables

The following environment variables are required (set as Replit Secrets):

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public API key

## Running the App

The app runs via the "Start application" workflow using `npm run dev` on port 5000.

Vite is configured to bind to `0.0.0.0:5000` with `allowedHosts: true` for Replit compatibility.

## Notes

- Migrated from Vercel to Replit (March 2026)
- `vercel.json` is kept for reference but not used on Replit
