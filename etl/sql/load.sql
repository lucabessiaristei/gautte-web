\set ON_ERROR_STOP on
\timing on

begin;

-- Supabase sets a default statement_timeout on the postgres role (~2min).
-- The stop_times COPY (~1M rows) exceeds it and gets killed mid-load.
-- idle_in_transaction guards against gaps between statements on large files.
-- SET LOCAL is scoped to this transaction: the role default is untouched.
set local statement_timeout = '30min';
set local idle_in_transaction_session_timeout = '30min';

-- Rebuilding these after the load is cheaper than maintaining them per row.
-- Rolled back automatically if anything below fails.
drop index if exists public.stop_times_trip_id_idx;
drop index if exists public.stop_times_stop_arrival_idx;

-- Single statement: resolves mutual FK dependencies without CASCADE.
truncate
  public.stop_times, public.timetable_stop_order, public.timetables,
  public.timetable_pages, public.trips, public.shapes, public.routes,
  public.calendar_dates, public.calendar, public.stop_attributes,
  public.stops, public.feed_info, public.agency;

-- Parents first, children after: FK constraints impose this order.
-- Explicit column lists are mandatory: generated columns sit at arbitrary
-- positions, so positional mapping would misalign the data.

\echo '[1/13] agency'
\copy public.agency (agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_phone, agency_fare_url, agency_email) from 'agency.txt' with (format csv, header true, force_null *)

\echo '[2/13] feed_info'
\copy public.feed_info (feed_publisher_name, feed_publisher_url, feed_lang, feed_start_date, feed_end_date, feed_version, feed_contact_email, feed_contact_url) from 'feed_info.txt' with (format csv, header true, force_null *)

\echo '[3/13] calendar'
\copy public.calendar (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date) from 'calendar.txt' with (format csv, header true, force_null *)

\echo '[4/13] stops'
\copy public.stops (stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon, zone_id, stop_url, location_type, parent_station, stop_timezone, wheelchair_boarding) from 'stops.txt' with (format csv, header true, force_null *)

\echo '[5/13] stop_attributes'
\copy public.stop_attributes (stop_id, stop_city) from 'stop_attributes.txt' with (format csv, header true, force_null *)

\echo '[6/13] timetable_pages'
\copy public.timetable_pages (timetable_page_id, timetable_page_label, filename) from 'timetable_pages.txt' with (format csv, header true, force_null *)

\echo '[7/13] routes'
\copy public.routes (route_id, agency_id, route_short_name, route_long_name, route_desc, route_type, route_url, route_color, route_text_color, route_sort_order) from 'routes.txt' with (format csv, header true, force_null *)

\echo '[8/13] calendar_dates'
\copy public.calendar_dates (service_id, date, exception_type) from 'calendar_dates.txt' with (format csv, header true, force_null *)

\echo '[9/13] shapes'
\copy public.shapes (shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence) from 'shapes.txt' with (format csv, header true, force_null *)

\echo '[10/13] trips'
\copy public.trips (route_id, service_id, trip_id, ...) from 'trips.txt' with (format csv, header true, force_null *)

\echo 'Normalizing trip_headsign'
with cleaned as (
  select trip_id,
         btrim(regexp_replace(
           regexp_replace(
             regexp_replace(trip_headsign, '\s+', ' ', 'g'),
             '\s+([,)])', '\1', 'g'),
           ',\s*$', '')) as normalized
  from public.trips
)
update public.trips t
set trip_headsign = c.normalized
from cleaned c
where t.trip_id = c.trip_id
  and t.trip_headsign is distinct from c.normalized;

\echo '[11/13] stop_times (largest file)'
\copy public.stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint) from 'stop_times.txt' with (format csv, header true, force_null *)

\echo '[12/13] timetables'
\copy public.timetables (timetable_id, route_id, direction_id, start_date, end_date, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_time, end_time, timetable_label, service_notes, orientation, timetable_page_id, timetable_sequence, direction_name, include_exceptions, show_trip_continuation) from 'timetables.txt' with (format csv, header true, force_null *)

\echo '[13/13] timetable_stop_order'
\copy public.timetable_stop_order (timetable_id, stop_id, stop_sequence) from 'timetable_stop_order.txt' with (format csv, header true, force_null *)

\echo 'Rebuilding indexes'
create index stop_times_trip_id_idx on public.stop_times using btree (trip_id);
create index stop_times_stop_arrival_idx on public.stop_times using btree (stop_id, arrival_seconds);

commit;

-- Outside the transaction: TRUNCATE resets planner statistics, and stale
-- stats make the planner ignore the indexes we just rebuilt.
\echo 'Updating statistics'
analyze public.stop_times;
analyze public.trips;
analyze public.stops;
analyze public.shapes;
analyze public.routes;
analyze public.calendar;
analyze public.calendar_dates;