-- Global signing budget: independent of spoofable client headers and shared by
-- all function instances. Counters retain no client IP or aircraft information.
create table public.source_viewer_budget (
 id smallint primary key check (id=1),
 enabled boolean not null default true,
 minute_limit integer not null default 60 check (minute_limit between 1 and 10000),
 day_limit integer not null default 1000 check (day_limit between 1 and 1000000),
 minute_started timestamptz not null default date_trunc('minute',clock_timestamp()),
 minute_used integer not null default 0 check (minute_used>=0),
 day_started date not null default (clock_timestamp() at time zone 'UTC')::date,
 day_used integer not null default 0 check (day_used>=0)
);
alter table public.source_viewer_budget enable row level security;
revoke all on public.source_viewer_budget from public,anon,authenticated;
grant select,update on public.source_viewer_budget to service_role;
insert into public.source_viewer_budget(id) values (1);

create function public.take_source_viewer_slot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 budget public.source_viewer_budget%rowtype;
 now_at timestamptz;
 minute_at timestamptz;
 day_at date;
 retry_seconds integer:=0;
begin
 select * into budget from public.source_viewer_budget where id=1 for update;
 if not found or not budget.enabled then raise exception 'SOURCE_VIEWER_UNAVAILABLE'; end if;
 now_at:=clock_timestamp();minute_at:=date_trunc('minute',now_at);day_at:=(now_at at time zone 'UTC')::date;
 if budget.minute_started<>minute_at then budget.minute_used:=0; end if;
 if budget.day_started<>day_at then budget.day_used:=0; end if;
 if budget.minute_used>=budget.minute_limit then
  retry_seconds:=greatest(1,ceil(extract(epoch from (minute_at+interval '1 minute'-now_at)))::integer);
 end if;
 if budget.day_used>=budget.day_limit then
  retry_seconds:=greatest(retry_seconds,1,ceil(extract(epoch from (((day_at+1)::timestamp at time zone 'UTC')-now_at)))::integer);
 end if;
 if retry_seconds>0 then return jsonb_build_object('allowed',false,'retry_after_seconds',retry_seconds); end if;
 update public.source_viewer_budget set minute_started=minute_at,minute_used=budget.minute_used+1,day_started=day_at,day_used=budget.day_used+1 where id=1;
 return jsonb_build_object('allowed',true,'retry_after_seconds',0);
end $$;
revoke all on function public.take_source_viewer_slot() from public,anon,authenticated;
grant execute on function public.take_source_viewer_slot() to service_role;
