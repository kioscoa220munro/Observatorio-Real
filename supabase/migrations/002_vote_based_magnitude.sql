-- Event magnitude is derived from the number of unique community confirmations.
create or replace function public.magnitude_from_votes(vote_count integer)
returns smallint
language sql
immutable
as $$
  select case
    when coalesce(vote_count, 0) >= 25 then 5
    when coalesce(vote_count, 0) >= 10 then 4
    when coalesce(vote_count, 0) >= 5 then 3
    when coalesce(vote_count, 0) >= 2 then 2
    else 1
  end::smallint;
$$;

-- Keep the existing RPC signature for compatibility, but ignore manual magnitude.
create or replace function public.create_report(
  p_lng double precision,
  p_lat double precision,
  p_category text,
  p_magnitude smallint,
  p_description text,
  p_evidence_urls text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.reports(location, category, magnitude, description, evidence_urls)
  values (
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_category,
    public.magnitude_from_votes(0),
    p_description,
    coalesce(p_evidence_urls, '{}')
  )
  returning id into rid;

  return rid;
end;
$$;

-- Every unique + updates the count, computed magnitude and community-confirmed status.
create or replace function public.bump_corroboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports
  set
    corroborations = corroborations + 1,
    magnitude = public.magnitude_from_votes(corroborations + 1),
    status = case when corroborations + 1 >= 3 then 'verificado' else status end
  where id = new.report_id;

  return new;
end;
$$;

-- Recalculate existing records from their current number of confirmations.
update public.reports
set magnitude = public.magnitude_from_votes(corroborations);

grant execute on function public.create_report(double precision, double precision, text, smallint, text, text[]) to anon, authenticated;
