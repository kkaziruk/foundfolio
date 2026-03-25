create table if not exists public.campus_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  university_name text not null,
  contact_name text not null,
  contact_email text not null,
  location_count text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

alter table public.campus_requests enable row level security;

create policy "Anyone can submit a campus request"
  on public.campus_requests
  for insert
  to anon, authenticated
  with check (true);
