-- Source of truth for public schema functions.
-- Extracted from the live database via pg_get_functiondef.
-- To restore: paste into the Supabase SQL Editor, or run:
--   psql "$DATABASE_URL" -f etl/sql/functions.sql
-- Note: rls_auto_enable belongs to Supabase infrastructure, not app logic.

CREATE OR REPLACE FUNCTION public.get_departures(p_stop_id text, p_now_seconds integer, p_lookahead_seconds integer, p_now_date text, p_yesterday_date text, p_day_of_week text, p_yesterday_day_of_week text, p_max_per_line integer DEFAULT 4)
 RETURNS TABLE(arrival_time text, stop_sequence integer, trip_id text, trip_headsign text, route_short_name text, agency_id text, route_type integer)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    
    with valid_departures as (
        select
            st.arrival_time,
            st.stop_sequence,
            t.trip_id,
            t.trip_headsign,
            r.route_short_name,
            r.agency_id,
            r.route_type::int,
            case
                when st.arrival_seconds >= (p_now_seconds + 86400) then st.arrival_seconds - 86400
                else st.arrival_seconds
            end as sort_time
        from stop_times st
        join trips t      on st.trip_id   = t.trip_id
        join routes r     on t.route_id   = r.route_id
        join calendar c   on t.service_id = c.service_id
        where
            st.stop_id = p_stop_id
            and st.arrival_time is not null
            and r.route_short_name is not null
            and (
                (
                    st.arrival_seconds between p_now_seconds and (p_now_seconds + p_lookahead_seconds)
                    and p_now_date between c.start_date and c.end_date
                    and (case p_day_of_week when 'monday' then c.monday when 'tuesday' then c.tuesday when 'wednesday' then c.wednesday when 'thursday' then c.thursday when 'friday' then c.friday when 'saturday' then c.saturday when 'sunday' then c.sunday end) = '1'
                )
                or
                (
                    st.arrival_seconds between (p_now_seconds + 86400) and (p_now_seconds + p_lookahead_seconds + 86400)
                    and p_yesterday_date between c.start_date and c.end_date
                    and (case p_yesterday_day_of_week when 'monday' then c.monday when 'tuesday' then c.tuesday when 'wednesday' then c.wednesday when 'thursday' then c.thursday when 'friday' then c.friday when 'saturday' then c.saturday when 'sunday' then c.sunday end) = '1'
                )
            )
    ),
    ranked_departures as (
        select
            vd.*,
            row_number() over (
                partition by vd.route_short_name, vd.trip_headsign 
                order by vd.sort_time
            ) as rn
        from valid_departures vd
    )
    select
        rd.arrival_time,
        rd.stop_sequence,
        rd.trip_id,
        rd.trip_headsign,
        rd.route_short_name,
        rd.agency_id,
        rd.route_type
    from ranked_departures rd
    where rd.rn <= p_max_per_line
    order by rd.sort_time;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_stops(search_query text)
 RETURNS TABLE(stop_code text, stop_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  -- Creiamo una variabile locale per la query pulita dagli spazi iniziali/finali
  clean_query text := trim(search_query);
BEGIN
  -- CONTROLLO: La query è formata SOLO da numeri? (Usiamo una Regular Expression)
  IF clean_query ~ '^\d+$' THEN
    
    RETURN QUERY
    SELECT 
      s.stop_code, 
      s.stop_name
    FROM stops s
    -- Cerca i codici che iniziano per il numero digitato
    WHERE s.stop_code ILIKE clean_query || '%'
    ORDER BY 
      -- Simula l'ordinamento numerico: i codici più corti (es. "12") vengono 
      -- prima di quelli lunghi (es. "123"), a parità di lunghezza usa l'ordine standard.
      length(s.stop_code) ASC,
      s.stop_code ASC
    LIMIT 8;

  -- ALTRIMENTI: Esegui la ricerca full-text per nome fermata
  ELSE
  
    RETURN QUERY
    WITH filtered_stops AS (
      SELECT 
        s.stop_code, 
        s.stop_name,
        regexp_replace(s.stop_name, '^Fermata \S+ - ', '', 'i') AS clean_name
      FROM stops s
      WHERE s.stop_search @@ to_tsquery('simple', regexp_replace(clean_query, '\s+', ':* & ', 'g') || ':*')
    )
    SELECT 
      f.stop_code, 
      f.stop_name
    FROM filtered_stops f
    ORDER BY 
      -- TIER 1: Rilevanza
      CASE 
          WHEN f.clean_name ILIKE clean_query THEN 0
          WHEN f.clean_name ILIKE clean_query || '%' THEN 1
          WHEN f.clean_name ILIKE '%' || clean_query || '%' THEN 2
          ELSE 3
      END ASC,
      -- TIER 2: Lunghezza del nome "pulito"
      length(f.clean_name) ASC,
      -- TIER 3: Ordine alfabetico in caso di pareggio
      f.clean_name ASC
    LIMIT 8;

  END IF;
END;
$function$
;