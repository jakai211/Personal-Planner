-- Run once in the Supabase SQL editor. Re-running is safe.
create table if not exists public.planner_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id)<=200), kind text not null check(kind in ('item','settings')),
 data jsonb not null, version bigint not null default 1, deleted boolean not null default false,
 updated_at timestamptz not null default now(), primary key(user_id,id)
);
alter table public.planner_records enable row level security;
drop policy if exists own_records on public.planner_records;
create policy own_records on public.planner_records for select to authenticated using(user_id=auth.uid());
revoke all on public.planner_records from anon,authenticated;
grant select on public.planner_records to authenticated;
create or replace function public.save_record(p_id text,p_kind text,p_data jsonb,p_deleted boolean,p_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.planner_records; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 if p_kind not in ('item','settings') or length(p_id)>200 or octet_length(p_data::text)>200000 or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid planner record'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_id,0));
 select * into r from public.planner_records where user_id=uid and id=p_id for update;
 if not found then
   if p_version<>0 then raise exception 'Record missing; restore from a backup'; end if;
   insert into public.planner_records(user_id,id,kind,data,deleted) values(uid,p_id,p_kind,p_data,p_deleted) returning * into r;
 elsif r.data=p_data and r.deleted=p_deleted and r.kind=p_kind then
   return jsonb_build_object('ok',true,'record',to_jsonb(r));
 elsif r.version<>p_version then
   return jsonb_build_object('ok',false,'record',to_jsonb(r));
 else
   update public.planner_records set data=p_data,deleted=p_deleted,kind=p_kind,version=version+1,updated_at=now() where user_id=uid and id=p_id returning * into r;
 end if;
 return jsonb_build_object('ok',true,'record',to_jsonb(r));
end $$;
revoke all on function public.save_record(text,text,jsonb,boolean,bigint) from public;
grant execute on function public.save_record(text,text,jsonb,boolean,bigint) to authenticated;

create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check(length(endpoint)<2048),subscription jsonb not null,
 unique(user_id,endpoint),check(subscription->>'endpoint'=endpoint),check(subscription->'keys' ? 'auth'),check(subscription->'keys' ? 'p256dh')
);
alter table public.push_subscriptions enable row level security;
drop policy if exists own_push on public.push_subscriptions;
create policy own_push on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;
create table if not exists public.push_deliveries (
 key text primary key,claimed_at timestamptz not null default now(),delivered boolean not null default false,attempts integer not null default 1
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
create or replace function public.claim_push(p_key text) returns boolean language plpgsql security definer set search_path=public as $$
declare claimed text;
begin
 insert into public.push_deliveries(key) values(p_key)
 on conflict(key) do update set claimed_at=now(),attempts=push_deliveries.attempts+1
 where not push_deliveries.delivered and push_deliveries.claimed_at<now()-interval '2 minutes' and push_deliveries.attempts<5
 returning key into claimed;
 return claimed is not null;
end $$;
revoke all on function public.claim_push(text) from public;
grant execute on function public.claim_push(text) to service_role;
