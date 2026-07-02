-- Credit accounting for paid scans and Lemon Squeezy one-time purchases.
alter table public.profiles
  add column credits_granted integer not null default 1,
  add column credits_used integer not null default 0;

alter table public.profiles
  add constraint profiles_credits_granted_nonnegative check (credits_granted >= 0),
  add constraint profiles_credits_used_nonnegative check (credits_used >= 0),
  add constraint profiles_credits_used_not_above_granted check (credits_used <= credits_granted);

update public.profiles
set credits_granted = 1
where credits_granted < 1;

create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'lemon_squeezy',
  provider_event_id text not null unique,
  provider_order_id text,
  credits integer not null check (credits > 0),
  amount_cents integer,
  currency text,
  raw_event jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;

create policy "Users can read own credit purchases"
  on public.credit_purchases for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.apply_credit_purchase(
  purchase_user_id uuid,
  purchase_provider_event_id text,
  purchase_provider_order_id text,
  purchase_credits integer,
  purchase_amount_cents integer,
  purchase_currency text,
  purchase_raw_event jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.profiles
  where id = purchase_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  insert into public.credit_purchases (
    user_id,
    provider_event_id,
    provider_order_id,
    credits,
    amount_cents,
    currency,
    raw_event
  )
  values (
    purchase_user_id,
    purchase_provider_event_id,
    purchase_provider_order_id,
    purchase_credits,
    purchase_amount_cents,
    purchase_currency,
    purchase_raw_event
  );

  update public.profiles
  set
    credits_granted = credits_granted + purchase_credits,
    is_paid = true
  where id = purchase_user_id;

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

revoke all on function public.apply_credit_purchase(uuid, text, text, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_credit_purchase(uuid, text, text, integer, integer, text, jsonb) to service_role;

create schema if not exists private;

create or replace function private.consume_audit_credit_on_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
begin
  if new.created_by is null then
    raise exception 'Audits must belong to a user.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = new.created_by
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if profile_row.credits_used >= profile_row.credits_granted then
    raise exception 'No scan credits remaining.';
  end if;

  update public.profiles
  set
    credits_used = credits_used + 1,
    is_paid = true
  where id = new.created_by;

  return new;
end;
$$;

revoke all on function private.consume_audit_credit_on_write() from public, anon, authenticated;

create trigger consume_credit_on_audit_insert
  before insert on public.audits
  for each row execute function private.consume_audit_credit_on_write();

create trigger consume_credit_on_audit_refresh
  before update of result, overall_score, scanned_at on public.audits
  for each row
  when (old.result is distinct from new.result)
  execute function private.consume_audit_credit_on_write();

drop policy if exists "Paid users can insert audits" on public.audits;
drop policy if exists "Paid users can update audits" on public.audits;
drop policy if exists "Paid users can delete reports" on public.reports;

create policy "Users with credits can insert audits"
  on public.audits for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Users with credits can update audits"
  on public.audits for update
  to authenticated
  using (true)
  with check (created_by = (select auth.uid()));

create policy "Audit owners can delete generated reports"
  on public.reports for delete
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = audit_id and a.created_by = (select auth.uid())
    )
  );
