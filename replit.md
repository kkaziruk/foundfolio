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

## Design System

A shared CSS design token system lives in `src/index.css`:
- CSS custom properties: `--color-ink`, `--color-accent`, `--color-bg`, `--color-border`, etc.
- Utility classes: `ff-card`, `ff-input`, `ff-btn-primary`, `ff-btn-ghost`, `ff-chip` + variants
- Brand tokens: `src/lib/brand.ts` (ink, sky, accent, gold)
- Body uses `Nunito Sans` (body) and `Poppins` (headings)

## UI Architecture

- **Student views** (mobile-first): `SearchPage.tsx`, `ItemDetail.tsx`, `HomePage.tsx`
  - Search is the hero interaction — white search panel at top, results below in 2-4 col grid
  - Item cards: aspect-[4/3] image, category chip, building with MapPin, relative date
  - ItemDetail: aspect-ratio image, metadata rows with colored icon badges, date_found shown, CTA note
  - Nav: slim h-14 sticky bar, small logo, inline campus name, sign out link
- **Admin/staff views** (laptop): `AdminPage.tsx`, `AdminDashboard.tsx`, `ItemsList.tsx`, `AddItemForm.tsx`
  - AdminPage: sticky h-14 nav, compact building selector bar, segmented tab control for Analytics/Buildings/Staff
  - AddItemForm: mobile SnapPager flow (step-by-step), AI-assisted category/description
  - ItemsList: search + bulk select + move modal + export
  - AdminDashboard: recharts 2.13.3 — BarChart (logged vs claimed), PieChart (categories), donut (claim rate), location progress bars

## Key Dependencies

- `recharts@2.13.3` — must stay on 2.x (3.x breaks with React 18 in Vite)
- `vite.config.ts`: `resolve.dedupe: ['react', 'react-dom']`, `optimizeDeps.include: ['recharts']`

## Notes

- Migrated from Vercel to Replit (March 2026)
- `vercel.json` is kept for reference but not used on Replit
- Google OAuth: add `https://5d1ad44a-7c1a-4aa2-b2fd-fadf55122452-00-2r6qiaax5v9va.kirk.replit.dev/**` to Supabase Auth → Redirect URLs
- Three roles: `student`, `building_manager`, `campus_admin`
- Student queries never return `additional_notes` (security)
- Supabase edge functions: `analyze-image`, `export-items`
