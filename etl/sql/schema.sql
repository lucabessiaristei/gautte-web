--
-- PostgreSQL database dump
--

\restrict UTngiNR3Thuqf60axG9gEpG59BwVYUQ3SNvABGeMCNr6jxcNKq1vHi0WeN9K87K

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get_departures(text, integer, integer, text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_departures(p_stop_id text, p_now_seconds integer, p_lookahead_seconds integer, p_now_date text, p_yesterday_date text, p_day_of_week text, p_yesterday_day_of_week text, p_max_per_line integer DEFAULT 4) RETURNS TABLE(arrival_time text, stop_sequence integer, trip_id text, trip_headsign text, route_short_name text, agency_id text, route_type integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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
$$;


--
-- Name: search_stops(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_stops(search_query text) RETURNS TABLE(stop_code text, stop_name text)
    LANGUAGE plpgsql
    AS $_$
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
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency (
    agency_id text NOT NULL,
    agency_name text,
    agency_url text,
    agency_timezone text,
    agency_lang text,
    agency_phone text,
    agency_fare_url text,
    agency_email text
);


--
-- Name: calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar (
    service_id text NOT NULL,
    monday text,
    tuesday text,
    wednesday text,
    thursday text,
    friday text,
    saturday text,
    sunday text,
    start_date text,
    end_date text
);


--
-- Name: calendar_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_dates (
    service_id text,
    date text,
    exception_type text
);


--
-- Name: feed_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_info (
    feed_publisher_name text,
    feed_publisher_url text,
    feed_lang text,
    feed_start_date text,
    feed_end_date text,
    feed_version text,
    feed_contact_email text,
    feed_contact_url text
);


--
-- Name: gtfs_import_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gtfs_import_log (
    id bigint NOT NULL,
    zip_sha256 text NOT NULL,
    feed_version text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL
);


--
-- Name: gtfs_import_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.gtfs_import_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.gtfs_import_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    route_id text NOT NULL,
    agency_id text,
    route_short_name text,
    route_long_name text,
    route_desc text,
    route_type integer,
    route_url text,
    route_color text,
    route_text_color text,
    route_sort_order integer
);


--
-- Name: shapes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shapes (
    shape_id text NOT NULL,
    shape_pt_lat double precision,
    shape_pt_lon double precision,
    shape_pt_sequence integer NOT NULL
);


--
-- Name: stop_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop_attributes (
    stop_id text,
    stop_city text
);


--
-- Name: stop_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop_times (
    trip_id text,
    arrival_time text,
    departure_time text,
    stop_id text,
    stop_sequence integer,
    stop_headsign text,
    pickup_type text,
    drop_off_type text,
    shape_dist_traveled text,
    timepoint text,
    arrival_seconds integer GENERATED ALWAYS AS (((((split_part(arrival_time, ':'::text, 1))::integer * 3600) + ((split_part(arrival_time, ':'::text, 2))::integer * 60)) + COALESCE((split_part(arrival_time, ':'::text, 3))::integer, 0))) STORED
);


--
-- Name: stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stops (
    stop_id text NOT NULL,
    stop_code text,
    stop_name text,
    stop_desc text,
    stop_lat double precision,
    stop_lon double precision,
    zone_id text,
    stop_url text,
    location_type text,
    parent_station text,
    stop_timezone text,
    wheelchair_boarding text,
    stop_search tsvector GENERATED ALWAYS AS ((to_tsvector('simple'::regconfig, COALESCE(regexp_replace(stop_name, '^Fermata \S+ - '::text, ''::text), ''::text)) || to_tsvector('simple'::regconfig, COALESCE(stop_code, ''::text)))) STORED
);


--
-- Name: timetable_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_pages (
    timetable_page_id text NOT NULL,
    timetable_page_label text,
    filename text
);


--
-- Name: timetable_stop_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_stop_order (
    timetable_id text,
    stop_id text,
    stop_sequence integer
);


--
-- Name: timetables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetables (
    timetable_id text NOT NULL,
    route_id text,
    direction_id text,
    start_date text,
    end_date text,
    monday text,
    tuesday text,
    wednesday text,
    thursday text,
    friday text,
    saturday text,
    sunday text,
    start_time text,
    end_time text,
    timetable_label text,
    service_notes text,
    orientation text,
    timetable_page_id text,
    timetable_sequence text,
    direction_name text,
    include_exceptions text,
    show_trip_continuation text
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    route_id text,
    service_id text,
    trip_id text NOT NULL,
    trip_headsign text,
    trip_short_name text,
    direction_id text,
    block_id text,
    shape_id text,
    wheelchair_accessible text,
    bikes_allowed text,
    limited_route text
);


--
-- Name: agency agency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_pkey PRIMARY KEY (agency_id);


--
-- Name: calendar calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar
    ADD CONSTRAINT calendar_pkey PRIMARY KEY (service_id);


--
-- Name: gtfs_import_log gtfs_import_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gtfs_import_log
    ADD CONSTRAINT gtfs_import_log_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (route_id);


--
-- Name: shapes shapes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shapes
    ADD CONSTRAINT shapes_pkey PRIMARY KEY (shape_id, shape_pt_sequence);


--
-- Name: stops stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (stop_id);


--
-- Name: stops stops_stop_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_stop_code_key UNIQUE (stop_code);


--
-- Name: timetable_pages timetable_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_pages
    ADD CONSTRAINT timetable_pages_pkey PRIMARY KEY (timetable_page_id);


--
-- Name: timetables timetables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_pkey PRIMARY KEY (timetable_id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (trip_id);


--
-- Name: calendar_dates_service_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_dates_service_id_idx ON public.calendar_dates USING btree (service_id);


--
-- Name: gtfs_import_log_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gtfs_import_log_started_at_idx ON public.gtfs_import_log USING btree (started_at DESC);


--
-- Name: routes_agency_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX routes_agency_id_idx ON public.routes USING btree (agency_id);


--
-- Name: stop_attributes_stop_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stop_attributes_stop_id_idx ON public.stop_attributes USING btree (stop_id);


--
-- Name: stop_times_stop_arrival_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stop_times_stop_arrival_idx ON public.stop_times USING btree (stop_id, arrival_seconds);


--
-- Name: stop_times_trip_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stop_times_trip_id_idx ON public.stop_times USING btree (trip_id);


--
-- Name: stops_stop_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stops_stop_search_idx ON public.stops USING gin (stop_search);


--
-- Name: timetable_stop_order_stop_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX timetable_stop_order_stop_id_idx ON public.timetable_stop_order USING btree (stop_id);


--
-- Name: timetable_stop_order_timetable_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX timetable_stop_order_timetable_id_idx ON public.timetable_stop_order USING btree (timetable_id);


--
-- Name: timetables_route_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX timetables_route_id_idx ON public.timetables USING btree (route_id);


--
-- Name: timetables_timetable_page_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX timetables_timetable_page_id_idx ON public.timetables USING btree (timetable_page_id);


--
-- Name: trips_route_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trips_route_id_idx ON public.trips USING btree (route_id);


--
-- Name: trips_service_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trips_service_id_idx ON public.trips USING btree (service_id);


--
-- Name: trips_shape_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trips_shape_id_idx ON public.trips USING btree (shape_id);


--
-- Name: calendar_dates calendar_dates_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_dates
    ADD CONSTRAINT calendar_dates_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.calendar(service_id);


--
-- Name: routes routes_agency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agency(agency_id);


--
-- Name: stop_times stop_times_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_times
    ADD CONSTRAINT stop_times_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id);


--
-- Name: stop_times stop_times_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_times
    ADD CONSTRAINT stop_times_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(trip_id);


--
-- Name: timetable_stop_order timetable_stop_order_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_stop_order
    ADD CONSTRAINT timetable_stop_order_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id);


--
-- Name: timetable_stop_order timetable_stop_order_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_stop_order
    ADD CONSTRAINT timetable_stop_order_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(timetable_id);


--
-- Name: timetables timetables_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(route_id);


--
-- Name: timetables timetables_timetable_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_timetable_page_id_fkey FOREIGN KEY (timetable_page_id) REFERENCES public.timetable_pages(timetable_page_id);


--
-- Name: trips trips_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(route_id);


--
-- Name: trips trips_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.calendar(service_id);


--
-- Name: agency; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agency ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feed_info ENABLE ROW LEVEL SECURITY;

--
-- Name: gtfs_import_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gtfs_import_log ENABLE ROW LEVEL SECURITY;

--
-- Name: agency public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.agency FOR SELECT USING (true);


--
-- Name: calendar public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.calendar FOR SELECT USING (true);


--
-- Name: calendar_dates public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.calendar_dates FOR SELECT USING (true);


--
-- Name: feed_info public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.feed_info FOR SELECT USING (true);


--
-- Name: gtfs_import_log public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.gtfs_import_log FOR SELECT USING (true);


--
-- Name: routes public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.routes FOR SELECT USING (true);


--
-- Name: shapes public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.shapes FOR SELECT USING (true);


--
-- Name: stop_attributes public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.stop_attributes FOR SELECT USING (true);


--
-- Name: stop_times public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.stop_times FOR SELECT USING (true);


--
-- Name: stops public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.stops FOR SELECT USING (true);


--
-- Name: timetable_pages public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.timetable_pages FOR SELECT USING (true);


--
-- Name: timetable_stop_order public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.timetable_stop_order FOR SELECT USING (true);


--
-- Name: timetables public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.timetables FOR SELECT USING (true);


--
-- Name: trips public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.trips FOR SELECT USING (true);


--
-- Name: routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

--
-- Name: shapes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shapes ENABLE ROW LEVEL SECURITY;

--
-- Name: stop_attributes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stop_attributes ENABLE ROW LEVEL SECURITY;

--
-- Name: stop_times; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stop_times ENABLE ROW LEVEL SECURITY;

--
-- Name: stops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

--
-- Name: timetable_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetable_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: timetable_stop_order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetable_stop_order ENABLE ROW LEVEL SECURITY;

--
-- Name: timetables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict UTngiNR3Thuqf60axG9gEpG59BwVYUQ3SNvABGeMCNr6jxcNKq1vHi0WeN9K87K

