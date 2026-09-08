BEGIN;
CREATE TABLE coach_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL UNIQUE REFERENCES employees(id),
 photo_file_id uuid REFERENCES files(id), biography text, specialties jsonb NOT NULL DEFAULT '[]', qualifications jsonb NOT NULL DEFAULT '[]',
 status varchar(32) NOT NULL CHECK(status IN ('active','inactive')), extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coach_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees(id), store_id uuid NOT NULL REFERENCES stores(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status varchar(32) NOT NULL CHECK(status IN ('available','unavailable')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at > starts_at)
);
CREATE INDEX coach_availability_time_idx ON coach_availability(employee_id,starts_at,ends_at);
CREATE TABLE course_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), name varchar(120) NOT NULL,
 kind varchar(32) NOT NULL CHECK(kind IN ('group','personal')), description text,
 session_count integer NOT NULL CHECK(session_count>0), duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 1440),
 validity_days integer CHECK(validity_days>0), price numeric(14,2) NOT NULL CHECK(price>=0),
 status varchar(32) NOT NULL CHECK(status IN ('active','inactive')), extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,store_id)
);
CREATE INDEX course_products_store_idx ON course_products(store_id,status);
CREATE TABLE member_course_packs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 course_product_id uuid NOT NULL, order_item_id uuid, assigned_coach_id uuid REFERENCES employees(id),
 total_sessions integer NOT NULL CHECK(total_sessions>0), remaining_sessions integer NOT NULL, reserved_sessions integer NOT NULL DEFAULT 0,
 starts_at timestamptz NOT NULL, expires_at timestamptz, status varchar(32) NOT NULL CHECK(status IN ('pending','active','frozen','expired','cancelled')),
 product_snapshot jsonb NOT NULL, extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(reserved_sessions>=0 AND reserved_sessions<=remaining_sessions AND remaining_sessions<=total_sessions),
 CHECK(expires_at IS NULL OR expires_at>starts_at), FOREIGN KEY(course_product_id,store_id) REFERENCES course_products(id,store_id),
 FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id), UNIQUE(id,member_id,store_id)
);
CREATE INDEX member_course_packs_expiry_idx ON member_course_packs(store_id,member_id,expires_at);
CREATE TABLE course_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), course_product_id uuid NOT NULL,
 coach_id uuid NOT NULL REFERENCES employees(id), room varchar(120), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000), status varchar(32) NOT NULL CHECK(status IN ('scheduled','completed','cancelled')),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at), FOREIGN KEY(course_product_id,store_id) REFERENCES course_products(id,store_id), UNIQUE(id,store_id)
);
CREATE INDEX course_sessions_time_idx ON course_sessions(store_id,starts_at,id);
CREATE INDEX course_sessions_coach_idx ON course_sessions(coach_id,starts_at,ends_at) WHERE status<>'cancelled';
-- Serialize scheduling for a coach or a room without adding an extension dependency.
CREATE FUNCTION validate_course_session_conflict() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('coach:' || NEW.coach_id::text,0));
 IF NEW.room IS NOT NULL AND NEW.room<>'' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('room:' || NEW.store_id::text || ':' || NEW.room,0));
 END IF;
 IF NEW.status<>'cancelled' AND EXISTS (
  SELECT 1 FROM course_sessions s WHERE s.id<>NEW.id AND s.status<>'cancelled'
   AND s.starts_at<NEW.ends_at AND s.ends_at>NEW.starts_at
   AND (s.coach_id=NEW.coach_id OR (NEW.room IS NOT NULL AND NEW.room<>'' AND s.store_id=NEW.store_id AND s.room=NEW.room))
 ) THEN RAISE EXCEPTION 'Coach or room schedule conflict' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER course_session_conflict BEFORE INSERT OR UPDATE ON course_sessions FOR EACH ROW EXECUTE FUNCTION validate_course_session_conflict();
CREATE TABLE bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 session_id uuid NOT NULL, member_course_pack_id uuid, member_card_id uuid REFERENCES member_cards(id),
 status varchar(32) NOT NULL CHECK(status IN ('confirmed','cancelled','attended','missed')), booked_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz, source varchar(32) NOT NULL CHECK(source IN ('web','miniapp','app')), note text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(member_course_pack_id,member_card_id)=1), CHECK(cancelled_at IS NULL OR cancelled_at>=booked_at),
 FOREIGN KEY(session_id,store_id) REFERENCES course_sessions(id,store_id),
 FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id),
 FOREIGN KEY(member_course_pack_id,member_id,store_id) REFERENCES member_course_packs(id,member_id,store_id), UNIQUE(id,member_id,store_id)
);
CREATE UNIQUE INDEX bookings_active_member_idx ON bookings(member_id,session_id) WHERE status IN ('confirmed','attended');
CREATE INDEX bookings_store_idx ON bookings(store_id,booked_at DESC,id);
CREATE TABLE checkins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 device_id uuid, access_event_id uuid, member_card_id uuid REFERENCES member_cards(id), entered_at timestamptz NOT NULL,
 exited_at timestamptz, method varchar(32) NOT NULL CHECK(method IN ('face','qr','manual','device')),
 status varchar(32) NOT NULL CHECK(status IN ('succeeded','failed')), visitor_type varchar(32) NOT NULL CHECK(visitor_type IN ('member','guest','unknown')),
 source_key varchar(255) NOT NULL UNIQUE, extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(exited_at IS NULL OR exited_at>=entered_at), CHECK((visitor_type='member')=(member_id IS NOT NULL)), UNIQUE(id,member_id,store_id)
);
CREATE INDEX checkins_store_time_idx ON checkins(store_id,entered_at DESC,id);
CREATE INDEX checkins_member_idx ON checkins(member_id,entered_at DESC);
CREATE TABLE qr_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id), scene_type varchar(32) NOT NULL CHECK(scene_type IN ('store','course','lesson','equipment')),
 scene_id uuid, platform varchar(32) NOT NULL CHECK(platform IN ('miniapp','app')), token_digest varchar(255) UNIQUE,
 target_uri text, provider_code_file_id uuid REFERENCES files(id), expires_at timestamptz,
 status varchar(32) NOT NULL CHECK(status IN ('pending','active','failed','expired')), created_by uuid NOT NULL REFERENCES admin_accounts(id),
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE lesson_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL UNIQUE, member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 coach_id uuid NOT NULL REFERENCES employees(id), checkin_id uuid NOT NULL, qr_code_id uuid REFERENCES qr_codes(id), face_event_id uuid,
 session_units integer NOT NULL CHECK(session_units>0), method varchar(32) NOT NULL CHECK(method IN ('face','qr')),
 status varchar(32) NOT NULL CHECK(status IN ('confirmed','reversed')), confirmed_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(booking_id,member_id,store_id) REFERENCES bookings(id,member_id,store_id),
 FOREIGN KEY(checkin_id,member_id,store_id) REFERENCES checkins(id,member_id,store_id)
);
CREATE INDEX lesson_records_store_idx ON lesson_records(store_id,confirmed_at DESC,id);
CREATE TABLE body_measurements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), employee_id uuid REFERENCES employees(id),
 measured_at timestamptz NOT NULL, height_cm numeric(10,3) CHECK(height_cm BETWEEN 30 AND 300), weight_kg numeric(10,3) CHECK(weight_kg BETWEEN 1 AND 700),
 body_fat_percent numeric(10,3) CHECK(body_fat_percent BETWEEN 0 AND 100), muscle_mass_kg numeric(10,3) CHECK(muscle_mass_kg BETWEEN 0 AND 500),
 measurements jsonb NOT NULL DEFAULT '[]', report_file_id uuid REFERENCES files(id), note text,
 created_by uuid REFERENCES admin_accounts(id), updated_by uuid REFERENCES admin_accounts(id), extra jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(muscle_mass_kg IS NULL OR weight_kg IS NULL OR muscle_mass_kg<=weight_kg),
 CHECK(jsonb_typeof(measurements)='array'), CHECK(num_nonnulls(height_cm,weight_kg,body_fat_percent,muscle_mass_kg,report_file_id)>0 OR jsonb_array_length(measurements)>0),
 FOREIGN KEY(member_id,store_id) REFERENCES member_stores(member_id,store_id)
);
CREATE INDEX body_measurements_member_idx ON body_measurements(store_id,member_id,measured_at DESC);
CREATE TABLE training_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id), coach_id uuid NOT NULL REFERENCES employees(id),
 name varchar(120) NOT NULL, goal text, starts_on date NOT NULL, ends_on date, status varchar(32) NOT NULL,
 extra jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_on IS NULL OR ends_on>=starts_on)
);
CREATE TABLE training_plan_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES training_plans(id), scheduled_on date, equipment_id uuid,
 exercise_name varchar(120) NOT NULL, sets integer CHECK(sets>=0), reps integer CHECK(reps>=0), duration_seconds integer CHECK(duration_seconds>=0),
 load_kg numeric(10,3) CHECK(load_kg>=0), instructions text, sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workout_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id), store_id uuid NOT NULL REFERENCES stores(id),
 training_plan_item_id uuid REFERENCES training_plan_items(id), lesson_record_id uuid REFERENCES lesson_records(id), checkin_id uuid REFERENCES checkins(id),
 performed_at timestamptz NOT NULL, metrics jsonb NOT NULL DEFAULT '{}', note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workout_records_member_idx ON workout_records(member_id,performed_at DESC);
CREATE TABLE product_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_product_id uuid NOT NULL REFERENCES course_products(id), store_id uuid NOT NULL REFERENCES stores(id),
 employee_id uuid NOT NULL REFERENCES employees(id), token_digest varchar(255) NOT NULL UNIQUE, offered_price numeric(14,2) NOT NULL CHECK(offered_price>=0),
 approval_instance_id uuid, expires_at timestamptz NOT NULL, status varchar(32) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version,name) VALUES(3,'training');
COMMIT;
