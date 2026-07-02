-- Raise the free account baseline from one scan credit to two.
alter table public.profiles
  alter column credits_granted set default 2;

update public.profiles
set credits_granted = 2
where credits_granted < 2;
