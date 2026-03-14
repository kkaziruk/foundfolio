# FoundFolio

**FoundFolio** is a modern digital lost-and-found system designed for universities and large institutions.

It replaces fragmented physical lost-and-found desks with a centralized platform where students can quickly search for lost items and staff can manage found items across campus buildings.

The goal is simple: **make recovering lost items fast, transparent, and scalable across institutions.**

---

# Key Features

## Student Search
Students can search items found across campus using natural descriptions like:

```
black water bottle
airpods
silver ring
```

Each item displays:

- photo
- item category
- building location
- time since it was found

Students can quickly determine whether their item has been recovered.

---

## Staff Item Logging
Building managers can log found items in seconds:

1. take a photo
2. add item description
3. select building + category
4. save

The item instantly becomes searchable for students.

---

## Claim Management

Admins can manage claim workflows:

- track claims
- verify ownership
- mark items returned
- maintain an audit trail

---

## Campus-Level Administration

Campus administrators can:

- manage buildings
- manage staff access
- monitor activity across campus
- review analytics

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS

## Backend

- Supabase (PostgreSQL + Auth + Storage)
- Supabase Edge Functions

## Infrastructure

- Vercel (deployment)
- GitHub (source control)

---

# Authentication

FoundFolio supports:

- Google OAuth for students
- staff authentication via Supabase

Permissions are enforced using **Postgres Row Level Security (RLS)** to ensure users only access the data appropriate to their role.

---

# Architecture

```
Frontend (React / Vite)
        ↓
Supabase Auth (OAuth)
        ↓
Postgres Database (RLS enforced)
        ↓
Supabase Storage (item images)
        ↓
Edge Functions (invites / admin flows)
```

---

# Current Deployment

Production:

https://foundfolio.co

---

# Roadmap

Planned improvements include:

- student "report found item" flow
- improved mobile UX
- analytics dashboards for administrators
- campus branding customization
- AI-assisted item matching

---

# License

MIT License
