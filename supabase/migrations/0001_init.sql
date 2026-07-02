-- Profiles: one row per auth user, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audits: one row per site (host without www). Stores the complete AuditResult
-- JSON, including every scraped page (markdown, links, metadata) and assets.
create table public.audits (
  id uuid primary key default gen_random_uuid(),
  host_key text not null unique,
  root_domain text not null,
  normalized_url text not null,
  input_url text not null,
  overall_score integer not null,
  result jsonb not null,
  scanned_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index audits_root_domain_idx on public.audits (root_domain);

alter table public.audits enable row level security;

create policy "Authenticated users can read audits"
  on public.audits for select
  to authenticated
  using (true);

create policy "Paid users can insert audits"
  on public.audits for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_paid
    )
  );

create policy "Paid users can update audits"
  on public.audits for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_paid
    )
  )
  with check (created_by = (select auth.uid()));

-- Reports: one generated remediation report per audit.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null unique references public.audits (id) on delete cascade,
  report jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Authenticated users can read reports"
  on public.reports for select
  to authenticated
  using (true);

create policy "Authenticated users can insert reports"
  on public.reports for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Authenticated users can update own reports"
  on public.reports for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Paid users can delete reports"
  on public.reports for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_paid
    )
  );
